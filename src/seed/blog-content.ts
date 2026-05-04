// Real article bodies for the website blog anchors. Fetched once via WebFetch
// and baked into the seed. When ZenRows ingestion is wired in production, the
// scraper writes the same shape (full_text + last_fetched_at + content_hash)
// into raw_payload_json — no UI changes needed.
//
// Lines starting with "## " render as <h3> in the modal; other non-empty
// lines render as <p>. Blank lines separate paragraphs.

// Hero image URLs for the blog anchors. Some sites JS-render their content
// (Wrench Group's Baker Brothers / Berkeys), so static fetches return no
// images — those URLs are absent here and the card falls back to a topic-
// themed gradient placeholder. ZenRows in production will be able to grab
// the real og:image / first content image once it's running headed.
export const BLOG_IMAGES: Record<string, string> = {
  'https://strittmatters.com/blog/common-water-heater-problems-and-troubleshooting-tips/':
    'https://strittmatters.com/wp-content/uploads/2024/04/Replacement-Photo-scaled.jpg',
  'https://www.legacywaterwell.com/blog/choosing-the-right-water-pump-for-yourself/':
    'https://qywpuwwlnssaundtxisp.supabase.co/storage/v1/object/public/blog-images/choosing-the-right-water-pump-for-yourself.jpg',
}

// Topic key per article — drives the gradient placeholder when no real image
// is available. Keep keys short and styled in activity-row.ts.
export const BLOG_TOPICS: Record<string, string> = {
  'https://bakerbrothersplumbing.com/blog/Preventing-Plumbing-Emergencies-in-Arlington--Smart-Tips-from-Baker-Brothers-Plumbing/': 'plumbing',
  'https://bakerbrothersplumbing.com/blog/Is-It-Time-to-Upgrade-Your-Thermostat--Smart-vs--Manual/': 'thermostat',
  'https://bakerbrothersplumbing.com/blog/Stay-Cool-in-Arlington--Expert-Air-Conditioning-Repair-from-Baker-Brothers-Plumbing,-Air---Electrical/': 'hvac',
  'https://bakerbrothersplumbing.com/blog/How-to-Improve-Indoor-Air-Quality-in-Hot-Weather/': 'air',
  'https://bakerbrothersplumbing.com/blog/Air-Conditioning-Repair-in-Dallas-Fort-Worth/': 'hvac',
  'https://www.berkeys.com/berkeys-blog/Preventing-Plumbing-Emergencies-in-Fort-Worth--Expert-Tips-from-Berkeys-Plumbing/': 'plumbing',
  'https://www.berkeys.com/berkeys-blog/dallas-plumbing-tips-for-water-heater-savings/': 'water-heater',
  'https://strittmatters.com/blog/common-water-heater-problems-and-troubleshooting-tips/': 'water-heater',
  'https://turnkeywells.com/water-well-drilling-permits-in-the-dallas-fort-worth-area/': 'well',
  'https://www.legacywaterwell.com/blog/choosing-the-right-water-pump-for-yourself/': 'well',
}

export const BLOG_CONTENT: Record<string, string> = {
  'https://bakerbrothersplumbing.com/blog/Preventing-Plumbing-Emergencies-in-Arlington--Smart-Tips-from-Baker-Brothers-Plumbing/':
`Plumbing issues always seem to happen when you least expect them. A burst pipe during a cold snap, a clogged drain just before hosting family, or a leaking water heater in the middle of the night — these problems can cause serious stress for Arlington homeowners. The good news is that most plumbing emergencies can be prevented with a little care and attention.

At Baker Brothers Plumbing, we've been proudly serving families in Arlington, Dalworthington Gardens, Pantego, and nearby neighborhoods for years. Our team of licensed plumbers understands the unique plumbing challenges in this area and provides reliable solutions to keep your home safe and comfortable.

## Why Plumbing Emergencies Happen

Plumbing systems are designed to last, but over time, small issues can snowball into major problems. Common causes of plumbing emergencies in Arlington include hidden leaks that slowly weaken pipes and damage walls, clogged drains from grease, soap, hair, or foreign objects, water heater breakdowns due to sediment buildup or age, frozen or burst pipes during North Texas cold snaps, and sewer line backups caused by tree roots or blockages.

By catching these issues early, you can save money, protect your home, and avoid the stress of emergency plumbing repairs.

## Smart Tips to Prevent Plumbing Disasters

Schedule annual plumbing inspections — just like your HVAC system or car, your plumbing system needs regular checkups. Annual inspections help spot leaks, pipe corrosion or slow drains before they turn into expensive repairs.

Protect your drains — clogged drains are one of the most common service calls in Arlington. To avoid backups, never pour grease or oil down your kitchen sink. Use drain screens in showers and tubs to catch hair and soap scum. Run hot water occasionally to clear pipes.

Maintain your water heater — flush the tank once a year to remove sediment buildup. Inspect for rust or corrosion on the tank and connections. Replace water heaters that are over 10 years old.

Winterize your pipes — Arlington winters may be mild, but sudden freezes do happen, and frozen pipes can burst and cause thousands of dollars in damage. Wrap exposed pipes in garages, crawl spaces or exterior walls. Let faucets drip during freezing nights. Keep your thermostat at a consistent temperature, even overnight.

Know your shut-off valve — when a major leak happens, shutting off your home's main water supply can make the difference between a small mess and a major flood. Take time to locate your shut-off valve and make sure your family knows how to use it.

## Final Thoughts

Plumbing emergencies can be stressful, expensive and inconvenient — but they're also preventable. By having annual inspections, maintaining your drains and water heater, winterizing and knowing what to do in case of a leak, you can protect your home and your sanity.`,

  'https://bakerbrothersplumbing.com/blog/Is-It-Time-to-Upgrade-Your-Thermostat--Smart-vs--Manual/':
`Your thermostat is one of the most important devices in your home. It controls your comfort, affects your energy usage and can even help improve indoor air quality. But if you're still using a traditional manual thermostat — or even a basic programmable one — you may be missing out on the benefits of today's smart thermostats.

## What Is a Manual Thermostat?

Manual thermostats are the traditional dial or slider-style devices that allow you to set the indoor temperature manually. Some may be digital, but they lack advanced programming or connectivity features. They're easy to use, low cost, and don't need Wi-Fi — but they offer no scheduling, less accurate temperature control, and tend to drive higher energy bills due to manual oversight.

Manual thermostats are often found in older Dallas homes, and while they still work, they don't offer much efficiency or convenience.

## What Is a Smart Thermostat?

Smart thermostats go beyond basic programming. They connect to Wi-Fi, learn your habits and make automatic adjustments to keep your home comfortable while saving energy.

Features typically include remote access via smartphone app, learning algorithms that adjust temperatures based on your behavior, energy usage reports, voice control compatibility (Alexa, Google Assistant, Siri), and geofencing to adjust settings when you're away or heading home. Popular models include Nest, Ecobee, Honeywell Home and Lennox iComfort.

## Smart Thermostat Benefits for Dallas Homeowners

Lower energy bills — smart thermostats adjust to your schedule and lifestyle. According to the U.S. Department of Energy, homeowners can save 10–15% on heating and cooling costs with proper thermostat programming.

Better comfort during hot Texas summers — in Dallas, July and August temperatures regularly top 100°F. Smart thermostats start cooling before you get home, adjust based on indoor humidity, and prevent system overuse during peak hours.

Remote control from anywhere — left for vacation and forgot to turn down the AC? Want to turn on the heat before you get back from a weekend trip? With a smart thermostat app, you can control your HVAC system from your phone.

Integration with smart home systems — many smart thermostats work seamlessly with smart lighting, security systems and voice assistants.

## When Should You Upgrade?

Consider making the switch if your energy bills are rising and you don't know why, you forget to turn down the thermostat when you leave home, your home feels too hot or too cold sometimes, your current thermostat is more than 10 years old, you're planning to replace your HVAC system soon, or you want more control over your home's comfort.

Basic smart thermostats cost between $100–$300, and the long-term savings and convenience usually pay for themselves within 1–2 years. Some Dallas utility providers offer rebates or incentives for installing energy-efficient smart thermostats.`,

  'https://bakerbrothersplumbing.com/blog/Stay-Cool-in-Arlington--Expert-Air-Conditioning-Repair-from-Baker-Brothers-Plumbing,-Air---Electrical/':
`When Texas heat is in full swing, there's nothing more important than a working air conditioning system. For Arlington homeowners, being cool isn't just about comfort — it's about safety and peace of mind.

## Why AC Repair in Arlington is a Must

Arlington experiences scorching summers with temperatures often reaching triple digits. When your air conditioner breaks down, it can become a stressful and uncomfortable situation fast. More importantly, a malfunctioning AC unit can affect indoor air quality and energy efficiency, leading to higher utility bills and even health risks during extreme heat.

## Common AC Problems We Fix

Refrigerant leaks reduce cooling power and cause systems to freeze up. Clogged air filters restrict airflow, making systems work harder and wear out faster. Faulty thermostats cause uneven cooling and temperature fluctuations. Clogged condensate drains cause leaks and water damage inside homes. Worn-out parts, from fan motors to capacitors, wear down over time and need replacing.

## Signs You Need AC Repair

Warm air blowing from vents, weak or inconsistent airflow, strange noises like grinding, squealing or banging, unusual odors when the system runs, higher utility bills with no explanation, and frequent on-and-off cycling. If you notice any of these symptoms, it's time to call the trusted AC experts.

## Benefits of Timely Repair

By calling at the first sign of trouble, you can enjoy consistent cooling throughout your home. A working system uses less energy and results in lower utility bills. Regular repairs help units last longer and delay replacement. Clean filters and coils keep the air fresher and healthier.`,

  'https://bakerbrothersplumbing.com/blog/How-to-Improve-Indoor-Air-Quality-in-Hot-Weather/':
`When summer heat arrives in Dallas, most people retreat indoors to escape the intense sun and humidity. However, while air conditioning keeps homes cool, it doesn't automatically ensure healthy indoor air. During hot months, indoor air quality can actually deteriorate significantly when windows remain closed and allergens get trapped inside. Poor air quality can worsen allergies, trigger asthma symptoms, cause fatigue, and disrupt sleep patterns.

## Change Your Air Filters

The simplest and most effective approach to better indoor air involves regular filter replacement. During summer, HVAC systems work continuously, causing filters to accumulate dust, pollen, pet dander, and other airborne particles much faster than during cooler months.

Industry recommendations suggest replacing filters every 30–60 days in the summer. Homeowners should prioritize high-efficiency pleated filters rated MERV 8 or higher. For households with allergy or asthma sufferers, upgrading to HEPA-grade filters provides additional protection.

## Control Humidity

Dallas summers bring both heat and moisture. When indoor humidity exceeds 50 percent, it creates an ideal environment for mold, mildew, and dust mites — all significant contributors to respiratory problems and degraded air quality.

Installing a whole-home dehumidifier helps when standard air conditioning cannot manage moisture levels independently. Running exhaust fans during cooking, bathing, and laundry use prevents humidity accumulation. Sealing air leaks around windows and doors prevents outdoor humid air from infiltrating the home.

## Schedule an HVAC Tune-Up

HVAC systems do more than regulate temperature — they circulate and filter the air occupants breathe daily. When systems become dirty or poorly maintained, they can actually contribute to indoor air problems rather than solve them. Professional tune-ups clean coils and components that harbor mold and bacteria, ensure proper airflow distribution, and maintain optimal temperature and humidity balance.

## Consider an Air Purification System

Several technologies exist, including ultraviolet air purifiers that eliminate airborne bacteria, mold spores, and viruses. Whole-home filtration systems can remove up to 99 percent of airborne particles. Electronic air cleaners use static electricity to trap pollutants throughout entire homes.

## Clean Your Air Ducts

Home ductwork accumulates dust, allergens, pet hair, and potentially mold over extended periods. When air conditioning operates, these accumulated contaminants distribute throughout every room. Warning signs include visible dust around vents, musty odors when systems run, mold visible inside ducts, and increased allergy symptoms indoors.`,

  'https://bakerbrothersplumbing.com/blog/Air-Conditioning-Repair-in-Dallas-Fort-Worth/':
`When Texas heat becomes unbearable, a functioning air conditioner isn't a luxury — it's essential. If your AC unit is releasing warm air, producing unusual sounds, or failing to activate, you need professional repair from an experienced local technician.

## Identifying When AC Repair is Necessary

Warm or weak air flow — when your unit operates but delivers insufficient cooling or reduced airflow, the problem often involves clogged filters, ductwork complications, or compressor malfunction.

Unusual noises — grinding, banging, squealing, or buzzing sounds indicate mechanical problems requiring immediate professional attention.

Elevated humidity levels — a properly functioning air conditioner manages both temperature and moisture. If your space feels uncomfortably damp despite running equipment, service is warranted.

Frequent cycling — systems that constantly switch on and off aren't operating efficiently, suggesting issues like an oversized unit, thermostat problems, or failing compressor components.

Unpleasant odors — burning smells or musty odors emanating from vents indicate electrical complications or mold development within the system.

Rising energy costs — unexpected bill increases suggest your air conditioner is consuming excessive energy due to underlying problems.

## Common Questions Answered

Repair costs — most repairs fall between $150 and $600, though pricing varies by issue. Upfront estimates are provided before commencing work.

Repair versus replacement — systems exceeding 10–15 years old that require frequent or expensive repairs may justify replacement as a long-term investment.

Service speed — same-day service and 24/7 emergency repairs are available for urgent situations.

Brand compatibility — service for major manufacturers including Trane, Carrier, Lennox, Goodman, and Rheem.

DIY repairs — professional technicians should handle HVAC work, as DIY attempts risk safety hazards and warranty voidance.`,

  'https://www.berkeys.com/berkeys-blog/Preventing-Plumbing-Emergencies-in-Fort-Worth--Expert-Tips-from-Berkeys-Plumbing/':
`Few things stress homeowners like plumbing emergencies. Whether it's a burst pipe, leaking water heater or stubborn clog, these issues cause significant damage and frustration. However, most plumbing disasters can be prevented with regular maintenance and proper knowledge.

## Common Causes of Plumbing Emergencies

Plumbing emergencies often start as small, unnoticed issues. Common culprits include clogged drains from grease, soap, hair or debris; hidden leaks inside walls or under floors that weaken structures; water heater failures from sediment buildup or aging equipment; burst pipes during sudden North Texas cold snaps; and sewer line backups from tree roots or blockages.

## How Fort Worth Homeowners Can Prevent Plumbing Disasters

Schedule regular plumbing inspections — annual inspections help catch early warning signs of leaks, corrosion or clogs before they escalate.

Protect your drains — avoid pouring oil or grease down sinks, use drain strainers in showers and tubs, and run hot water occasionally to prevent buildup.

Maintain your water heater — flush tanks annually to remove sediment, inspect for leaks or rust, and replace units typically lasting 8–12 years.

Winterize your pipes — insulate exposed pipes, allow faucets to drip slightly during freezes, and maintain consistent thermostat temperatures.

Know your shut-off valve location — quickly shutting off the main water supply during leaks can prevent thousands in damage.

## Why Fort Worth Homeowners Trust Berkeys

Berkeys offers licensed, experienced plumbers; fast response times; transparent upfront pricing; and decades of trusted local reputation. Berkeys serves Fort Worth and surrounding areas including Haltom City, Benbrook, Richland Hills, Forest Hill, Westworth Village, River Oaks, and Edgecliff Village.`,

  'https://www.berkeys.com/berkeys-blog/dallas-plumbing-tips-for-water-heater-savings/':
`Plumbers in Dallas say homeowners and business owners can achieve significant savings by adjusting their water heater temperature settings. According to the Department of Energy, running a standard electric water heater costs between $415 and $460 annually. Lowering the temperature to 120 degrees could reduce these costs by 6 to 10 percent yearly — potentially saving $25 to $42 per year for families with typical usage.

## How to Adjust Your Water Heater

Gas water heaters have a single control dial, while electric models typically feature two separate dials for top and bottom heating elements. Set both dials to the same temperature for even heating.

Steps to follow: measure current temperature at the tap farthest from your heater using a thermometer, mark the current dial setting, turn the temperature control knob toward warm, wait 24 hours and test again, adjust until reaching 120 degrees, then mark the new setting. Turn down or off when away from home.

## Important Health Consideration

Setting temperatures below 140 degrees allows bacteria like Legionella to grow more easily. Bacteria can't survive for more than a minute at 140 degrees, but thrive at 120 degrees. Those with compromised immune systems, respiratory conditions, or advanced age should consult their doctor before lowering temperatures.

Berkeys Air Conditioning, Plumbing & Electrical offers professional assistance with water heater adjustments throughout the Dallas-Fort Worth area.`,

  'https://strittmatters.com/blog/common-water-heater-problems-and-troubleshooting-tips/':
`## Types of Hot Water Heaters

Three primary systems serve residential homes: conventional storage tanks that heat and hold water until needed, tankless units that deliver hot water on demand, and heat pump hybrids drawing energy from ground and air sources.

## No Hot Water

When no hot water reaches your fixtures, check these potential culprits: tripped breakers or blown fuses, incorrectly calibrated thermostats, faulty heating elements, or — for gas units — a dead pilot light or broken thermocouple. Start with simple diagnostics like verifying thermostat settings and inspecting your electrical panel before calling professionals.

## Lukewarm Water or Insufficient Hot Water

An undersized water heater may struggle to meet household demand. If you notice hot water returns after waiting between uses, you likely need a larger unit. Persistent lukewarm water suggests sediment or scale buildup requiring tank flushing and descaling.

## Discolored Water

Brown or rust-colored water can result from corrosion in your hot water tank, or a deteriorating anode rod. Most tanked systems include sacrificial anode rods warranting replacement every 5–10 years.

## Water Heater Leaks

Minor drips from pressure release valves are normal, but pooling water indicates serious problems from faulty connections, defective valves, or tank rupture requiring immediate professional attention.

## Popping or Bubbling Noises

Hard water mineral deposits settle as sediment, causing boiling water to create gurgling sounds. Tank flushing eliminates accumulated sediment effectively.

## Water Smelling Like Rotten Eggs

Sediment harboring bacteria creates unpleasant odors. Professional flushing helps, though units older than 12–15 years may warrant replacement since odors can persist.`,

  'https://turnkeywells.com/water-well-drilling-permits-in-the-dallas-fort-worth-area/':
`The process of securing water well drilling permits in the Dallas-Fort Worth area involves navigating both state and local regulatory requirements. These permissions exist to protect environmental quality, water resources, and public health — they represent far more than administrative formality.

## The Breakdown of Required Permits

State permits — Texas requires specific permissions based on well classification (residential, agricultural, or commercial) and water source type. Drilling for water wells in Texas must adhere to the state's strict water conservation and quality regulations enforced through state-level licenses.

Local regulations — beyond state requirements, the Dallas-Fort Worth area imposes additional standards including zoning laws and environmental protections. These municipal rules prevent drilling activities from harming local ecosystems or depleting water resources.

## The Process for Obtaining Permits

Application submission — applicants must submit detailed documentation covering site specifics, well construction plans, and projected water usage to relevant authorities.

Review and public notice — officials examine applications for regulatory compliance while the community receives opportunity to review plans and voice concerns during a public notice period.

Inspection for compliance — local authorities conduct site inspections to verify that the planned drilling location and project complies with all zoning, safety, and environmental standards.

Approval and commencement — once all stages pass without unresolved issues, formal permits are granted, authorizing drilling activities to begin.

## Common Hurdles in the Permitting Process

Documentation requirements — achieving the necessary level of detail demands precise information about technical specifications, environmental assessments, and water use plans.

Environmental protections — Texas regulations may necessitate additional ecological surveys or project modifications to assess potential impacts on wildlife habitats and water quality.

Neighboring property rights — applicants must address concerns regarding drilling impacts on adjacent properties, potentially requiring negotiations or safeguards to protect neighboring water supplies.

## How Regulations Impact the Drilling Process and Timeline

Delays — the detailed review process can extend project timelines significantly. Environmental assessments or required plan revisions may add weeks or months to schedules.

Increased costs — compliance modifications, whether for environmental protection or neighboring property concerns, can substantially increase overall project expenses through advanced techniques, additional studies, or mitigation measures.`,

  'https://www.legacywaterwell.com/blog/choosing-the-right-water-pump-for-yourself/':
`Selecting a well pump requires understanding three core factors: your well depth, household water demand, and pressure needs. Getting these measurements correct ensures reliable performance and prevents premature replacement or chronic low pressure issues.

## Submersible vs. Jet Pump

Two primary residential pump types exist. Submersible pumps are installed deep within the well casing underwater. They offer quiet operation and efficiency, making them ideal for wells exceeding 25 feet. Most North Texas installations use this type.

Shallow well jet pumps sit above ground and use suction to draw water upward. These function only in wells under 25 feet and remain uncommon locally.

Deep well jet pumps can reach depths to 100 feet but sacrifice efficiency compared to submersible models and present greater maintenance challenges.

For Fort Worth and Parker County homeowners, submersible pumps represent the optimal choice due to superior longevity and reliability in the region's deeper wells.

## What Size Pump Do You Need?

Two specifications determine proper sizing: GPM (gallons per minute) and HP (horsepower). A four-person household typically requires 6–8 GPM minimum. Irrigation or livestock demands increase requirements to 10–15 GPM or beyond. Most residential submersible units range from ½ to 1.5 HP. Deeper wells (300+ feet) demand greater horsepower to overcome head pressure.

Undersized pumps run continuously and burn out prematurely. Oversized units waste energy and create pressure fluctuations.

## Does Your Pressure Tank Matter?

Yes. The pressure tank stores pressurized water, preventing constant pump cycling when taps open. Proper sizing protects the motor and maintains steady pressure. Rapid cycling typically signals tank failure rather than pump malfunction.

## Signs Your Current Pump Needs Replacing

Warning indicators include sputtering or air in water lines, sudden pressure drops, constant running without pressure buildup, no water output, and age beyond 10–15 years with declining performance. Avoid waiting for complete failure, as struggling pumps risk expensive motor burnout.

## FAQ

How long do submersible well pumps last? Quality submersible pumps typically function 10–15 years with proper maintenance. Water quality, sizing accuracy, and cycling frequency all impact longevity.

Can I replace my own well pump? While technically possible, professional installation is strongly recommended. DIY attempts risk damaging the pump, electrical connections, or well casing itself.

How much does a well pump replacement cost in Texas? Most residential replacements range $1,200–$2,500 based on depth and pump specifications.`,
}
