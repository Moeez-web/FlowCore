import { config } from '../config.ts'

const API_BASE = 'https://api.apify.com/v2'

export class ApifyError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'ApifyError'
  }
}

interface ActorRun {
  id: string
  status: string
  defaultDatasetId: string
  defaultKeyValueStoreId: string
}

export interface ActorResult<T> {
  items: T[]
  keyValueStoreId: string
}

/** Kick off an Apify actor run, wait for completion, return dataset items + KVS ID. */
export async function runActorAndWait<T = Record<string, unknown>>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = config.apify.timeoutMs,
): Promise<ActorResult<T>> {
  if (!config.apify.apiToken) {
    throw new ApifyError('APIFY_API_TOKEN is not set')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const authHeaders = {
    'Authorization': `Bearer ${config.apify.apiToken}`,
    'Content-Type': 'application/json',
  }

  try {
    // Start the actor run
    const runRes = await fetch(`${API_BASE}/acts/${actorId}/runs`, {
      method: 'POST',
      signal: controller.signal,
      headers: authHeaders,
      body: JSON.stringify(input),
    })

    if (!runRes.ok) {
      const detail = await runRes.text().catch(() => '')
      throw new ApifyError(`Apify start ${actorId} HTTP ${runRes.status}: ${detail.slice(0, 300)}`)
    }

    const runBody = (await runRes.json()) as { data: ActorRun }
    const runId = runBody.data.id
    const datasetId = runBody.data.defaultDatasetId
    const kvsId = runBody.data.defaultKeyValueStoreId

    // Poll until done (max ~2 min worth of polls)
    const pollInterval = 5_000
    const maxPolls = Math.floor(timeoutMs / pollInterval)
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, pollInterval))

      const pollRes = await fetch(`${API_BASE}/actor-runs/${runId}`, {
        signal: controller.signal,
        headers: authHeaders,
      })
      if (!pollRes.ok) continue

      const pollBody = (await pollRes.json()) as { data: ActorRun }
      const status = pollBody.data.status

      if (status === 'SUCCEEDED') {
        // Fetch dataset items
        const itemsRes = await fetch(
          `${API_BASE}/datasets/${datasetId}/items?clean=true`,
          { signal: controller.signal, headers: authHeaders },
        )
        if (!itemsRes.ok) {
          const detail = await itemsRes.text().catch(() => '')
          throw new ApifyError(`Apify dataset fetch HTTP ${itemsRes.status}: ${detail.slice(0, 300)}`)
        }
        const items = (await itemsRes.json()) as T[]
        return { items, keyValueStoreId: pollBody.data.defaultKeyValueStoreId || kvsId }
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new ApifyError(`Apify actor ${actorId} run ${runId} ended with status: ${status}`)
      }
    }

    throw new ApifyError(`Apify actor ${actorId} run ${runId} did not finish within timeout`)
  } catch (err) {
    if (err instanceof ApifyError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApifyError(`Apify actor ${actorId} timed out`, err)
    }
    throw new ApifyError(`Apify request failed for ${actorId}: ${(err as Error).message}`, err)
  } finally {
    clearTimeout(timer)
  }
}

/** List keys in a key-value store. Returns map of key → public URL. */
export async function listKvsKeys(keyValueStoreId: string): Promise<Map<string, string>> {
  if (!config.apify.apiToken) return new Map()
  const res = await fetch(`${API_BASE}/key-value-stores/${keyValueStoreId}/keys`, {
    headers: { Authorization: `Bearer ${config.apify.apiToken}` },
  })
  if (!res.ok) return new Map()
  const body = (await res.json()) as { data: { items: Array<{ key: string; recordPublicUrl?: string }> } }
  const map = new Map<string, string>()
  for (const item of body.data?.items ?? []) {
    map.set(item.key, `${API_BASE}/key-value-stores/${keyValueStoreId}/records/${encodeURIComponent(item.key)}`)
  }
  return map
}