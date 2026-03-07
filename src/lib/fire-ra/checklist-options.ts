/**
 * Fire RA — Premises-type-specific checklist options
 * Master data for all assessment items across all premises types.
 * Each item has common options (all premises) + premises-specific additions.
 */

import type { PremisesType, ChecklistOption, ChecklistFieldData } from '@/types/fire-ra';

export type ChecklistField = 'finding' | 'existingControls' | 'actionRequired';

export interface ChecklistOptionSet {
  common: string[];
  premises: Partial<Record<PremisesType, string[]>>;
}

type ItemChecklists = Record<ChecklistField, ChecklistOptionSet>;

// ---------------------------------------------------------------------------
// SECTION 2: Fire Hazard Identification
// ---------------------------------------------------------------------------

const ITEM_2_1: ItemChecklists = {
  // Sources of ignition
  finding: {
    common: [
      'Electrical equipment in use throughout premises',
      'Fixed heating system present',
      'Portable heaters observed in occupied areas',
      'Lighting installations including halogen/spotlights',
      'Smoking materials found in non-designated areas',
      'Potential for arson (unsecured external areas)',
    ],
    premises: {
      restaurant_cafe: [
        'Commercial cooking equipment (fryers, grills, ovens)',
        'Heat lamps or food warmers at service pass',
        'Candles on tables or decorative open flames',
        'Gas-fired pizza oven or charcoal grill',
        'Toaster and other countertop appliances',
      ],
      pub_bar: [
        'Bar cellar cooling and dispensing equipment',
        'Decorative lighting (fairy lights, neon signs)',
        'Open fireplace or log burner in public area',
        'Outdoor patio heaters (gas)',
        'Glass washing and dishwashing equipment',
      ],
      hotel_bnb: [
        'Guest room electrical appliances (kettles, hair dryers)',
        'Laundry room equipment (tumble dryers, irons)',
        'Guest room portable charging devices',
        'Decorative lighting in corridors and reception',
      ],
      retail_shop: [
        'Display lighting and spotlights',
        'Electronic point-of-sale equipment',
        'Stock room electrical equipment',
        'Seasonal decorative lighting',
      ],
      warehouse: [
        'Forklift trucks and battery charging stations',
        'Conveyor belt motors and machinery',
        'Hot work areas (welding, cutting, grinding)',
        'Dock door heaters and loading bay equipment',
      ],
      food_manufacturing: [
        'Industrial ovens and baking equipment',
        'Steam generation plant and boilers',
        'Processing line motors and drives',
        'Hot oil and deep frying equipment',
        'Packaging machinery with friction points',
      ],
      office: [
        'IT server room and network equipment',
        'Desktop computers and multi-plug adapters',
        'Kitchen area appliances (microwave, toaster, kettle)',
        'Phone and laptop charging stations',
      ],
    },
  },
  existingControls: {
    common: [
      'PAT testing programme in place and current',
      'Electrical installation condition report (EICR) within 5 years',
      'No smoking policy enforced throughout premises',
      'Portable heaters prohibited or controlled',
      'Regular visual inspection of electrical equipment',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen extract system serviced and cleaned regularly',
        'Deep fat fryer temperature limiters fitted and tested',
        'Candle policy in place (enclosed holders, supervised)',
        'Gas safety certificate current (annual)',
      ],
      pub_bar: [
        'Fireplace/log burner has fireguard and clear zone',
        'Cellar cooling equipment on dedicated circuit',
        'Patio heater stability and clearance checks',
      ],
      hotel_bnb: [
        'Guest information on safe appliance use',
        'Laundry room lint filters cleaned regularly',
        'Fixed hair dryers installed to avoid portable units',
      ],
      warehouse: [
        'Hot work permit system in operation',
        'Forklift charging area designated with ventilation',
        'Battery charging station isolated from combustibles',
      ],
      food_manufacturing: [
        'Oven and boiler maintenance schedule in place',
        'Processing line emergency stop accessible',
        'Industrial gas safety systems maintained',
      ],
      office: [
        'IT equipment on dedicated circuits with UPS',
        'Desk policy limits personal electrical devices',
        'Multi-plug adaptors prohibited (extension leads only)',
      ],
    },
  },
  actionRequired: {
    common: [
      'Arrange PAT testing for untested equipment',
      'Update EICR if more than 5 years old',
      'Remove or secure identified ignition sources',
      'Improve arson prevention (secure bins, improve lighting)',
      'Remove unauthorized portable heaters',
    ],
    premises: {
      restaurant_cafe: [
        'Service kitchen extraction and clean grease filters',
        'Replace open-flame candles with LED alternatives',
        'Install automatic fire suppression over deep fat fryers',
        'Ensure gas safety certificate is renewed',
      ],
      pub_bar: [
        'Install fireguard around open fire if missing',
        'Check patio heater stability and gas connections',
        'Replace decorative lighting with LED low-heat alternatives',
      ],
      hotel_bnb: [
        'Install fixed hair dryers in guest bathrooms',
        'Add fire safety notices in guest rooms',
        'Implement laundry lint filter cleaning schedule',
      ],
      warehouse: [
        'Review and enforce hot work permit procedures',
        'Designate and improve forklift charging bay',
        'Add signage at battery charging stations',
      ],
      food_manufacturing: [
        'Schedule oven and boiler maintenance review',
        'Inspect processing line for friction hotspots',
      ],
      office: [
        'Enforce desk electrical device policy',
        'Check IT server room cooling and ventilation',
      ],
    },
  },
};

const ITEM_2_2: ItemChecklists = {
  // Sources of fuel
  finding: {
    common: [
      'General waste and rubbish accumulation observed',
      'Paper, cardboard, and packaging materials stored',
      'Textiles and soft furnishings present',
      'Foam or plastic materials in use',
      'Timber construction or furnishing elements',
    ],
    premises: {
      restaurant_cafe: [
        'Cooking oils and fats stored in kitchen area',
        'Cardboard delivery boxes accumulating near exits',
        'Paper menus and napkin dispensers throughout',
        'Fabric tablecloths and seat upholstery',
        'Cleaning chemicals stored under counters',
      ],
      pub_bar: [
        'Upholstered seating and curtains in public areas',
        'Beer/spirits stock with alcohol content',
        'Decorative timber and paper throughout',
        'Cellar gas cylinders (CO2, mixed gas)',
      ],
      hotel_bnb: [
        'Bedding, mattresses, curtains in guest rooms',
        'Laundry stockpile (clean and soiled)',
        'Carpeting throughout corridors and rooms',
        'Guest luggage and personal belongings',
      ],
      retail_shop: [
        'Stock and packaging materials in sales floor',
        'Cardboard and polystyrene in stock room',
        'Display materials and point-of-sale items',
        'Clothing or fabric merchandise',
      ],
      warehouse: [
        'Racked or palletised stock (combustible goods)',
        'Pallet wrap, shrink wrap, and packaging materials',
        'Cardboard and polystyrene packing',
        'Flammable liquids or aerosols in storage',
      ],
      food_manufacturing: [
        'Flour dust and powdered ingredients',
        'Cooking oils in bulk storage',
        'Cardboard packaging and wrapping materials',
        'Plastic containers and food-grade materials',
      ],
      office: [
        'Paper files and archive storage',
        'Upholstered office chairs and partitions',
        'Cardboard and packaging from deliveries',
      ],
    },
  },
  existingControls: {
    common: [
      'Regular housekeeping and waste removal schedule',
      'Waste bins emptied daily and externally stored',
      'Combustible materials kept away from ignition sources',
      'Storage areas kept tidy and well-organised',
    ],
    premises: {
      restaurant_cafe: [
        'Cooking oil stored in sealed containers away from heat',
        'Daily breakdown of delivery packaging',
        'Grease trap and extract filter cleaning schedule',
      ],
      pub_bar: [
        'Cellar gas cylinders secured and ventilated',
        'Alcohol stock stored in designated areas',
        'Regular upholstery and furnishing inspections',
      ],
      hotel_bnb: [
        'Laundry managed on rotation, not stockpiled',
        'Fire-retardant bedding and curtains specified',
        'Corridor furnishings kept to minimum',
      ],
      warehouse: [
        'Racking separation distances maintained',
        'Flammable liquids in bunded, ventilated store',
        'Packaging waste cleared from aisles daily',
      ],
      food_manufacturing: [
        'Dust extraction systems in place for flour/powder',
        'Bulk oil stored in separate bunded area',
      ],
      office: [
        'Archive storage limited and controlled',
        'Desk clear policy enforced',
      ],
    },
  },
  actionRequired: {
    common: [
      'Implement regular waste removal schedule',
      'Reduce combustible material accumulation',
      'Improve separation of fuel sources from ignition',
      'Review storage arrangements for combustible materials',
    ],
    premises: {
      restaurant_cafe: [
        'Improve cooking oil storage arrangements',
        'Install self-closing bin lids in kitchen',
        'Schedule daily removal of delivery packaging',
      ],
      pub_bar: [
        'Secure cellar gas cylinder storage',
        'Review alcohol storage separation',
      ],
      hotel_bnb: [
        'Specify fire-retardant soft furnishings',
        'Review laundry room storage limits',
      ],
      warehouse: [
        'Improve flammable liquid storage (bunding, ventilation)',
        'Clear packaging waste daily from aisles',
        'Review racking separation distances',
      ],
      food_manufacturing: [
        'Review dust extraction system adequacy',
        'Improve oil storage separation and bunding',
      ],
      office: [
        'Reduce paper file storage, digitise where possible',
        'Enforce clear desk policy',
      ],
    },
  },
};

const ITEM_2_3: ItemChecklists = {
  // Sources of oxygen
  finding: {
    common: [
      'Natural ventilation via openable windows and doors',
      'Mechanical ventilation systems installed',
      'Air conditioning or HVAC system present',
      'No oxidising materials identified on premises',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen extract ventilation creating airflow',
        'Open pass between kitchen and dining area',
        'Air conditioning in dining areas',
      ],
      pub_bar: [
        'Cellar ventilation system',
        'Public area air conditioning',
        'Open windows in summer months',
      ],
      hotel_bnb: [
        'Central HVAC system serving all rooms',
        'Guest room openable windows',
        'Corridor ventilation systems',
      ],
      warehouse: [
        'Large roller shutter doors creating cross-ventilation',
        'Roof ventilation and extraction',
        'Oxidising chemicals stored on premises',
      ],
      food_manufacturing: [
        'Process ventilation and extraction systems',
        'Clean room air handling units',
        'Medical oxygen for first aid supplies',
      ],
      office: [
        'Central air conditioning system',
        'Openable windows on occupied floors',
      ],
    },
  },
  existingControls: {
    common: [
      'HVAC system maintained and inspected regularly',
      'Ventilation does not pass through fire compartment walls',
      'Fire dampers fitted in ductwork where required',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen extract on dedicated system with fire damper',
      ],
      warehouse: [
        'Oxidising chemicals stored per COSHH requirements',
        'Roller shutter doors close on fire alarm activation',
      ],
      food_manufacturing: [
        'Process extraction with fire dampers at compartment walls',
      ],
    },
  },
  actionRequired: {
    common: [
      'Check fire dampers are fitted and functional in ductwork',
      'Review HVAC maintenance schedule',
      'Ensure ventilation paths do not breach fire compartmentation',
    ],
    premises: {
      warehouse: [
        'Verify roller shutters link to fire alarm for auto-close',
        'Review oxidising material storage arrangements',
      ],
    },
  },
};

const ITEM_2_4: ItemChecklists = {
  // Hazardous processes
  finding: {
    common: [
      'No hazardous processes identified',
      'Hot work occasionally carried out on premises',
    ],
    premises: {
      restaurant_cafe: [
        'Deep fat frying conducted daily',
        'Flambe cooking performed',
        'Gas-fired charcoal or wood-fired cooking',
        'Hot oil used for cooking at high temperatures',
      ],
      pub_bar: [
        'Deep fat frying in kitchen',
        'Cellar line cleaning with chemicals',
        'Gas cylinder changeover procedures',
      ],
      hotel_bnb: [
        'Laundry ironing and pressing operations',
        'Breakfast cooking with gas or electric appliances',
      ],
      warehouse: [
        'Welding, cutting, or grinding operations',
        'Battery charging of electric vehicles/forklifts',
        'Spray painting or solvent use',
        'Dust-producing processes (sawing, sanding)',
      ],
      food_manufacturing: [
        'Deep frying at industrial scale',
        'Oven baking at high temperatures',
        'Spray drying processes',
        'Dust-producing milling or grinding',
        'Steam cleaning and sterilisation',
      ],
      office: [
        'No significant hazardous processes identified',
        'Occasional maintenance work (hot work by contractors)',
      ],
    },
  },
  existingControls: {
    common: [
      'Hot work permit system in place for contractor work',
      'Staff trained in safe procedures',
    ],
    premises: {
      restaurant_cafe: [
        'Automatic fire suppression fitted to deep fat fryers',
        'Flambe procedures limited to trained staff only',
        'Fire blanket within reach of cooking stations',
        'Temperature-limited thermostats on fryers',
      ],
      pub_bar: [
        'Cellar gas changeover by trained staff only',
        'Kitchen deep fat fryer safety features checked',
      ],
      warehouse: [
        'Hot work permit system with fire watch',
        'Designated welding/cutting area with screens',
        'Battery charging area ventilated and signed',
      ],
      food_manufacturing: [
        'Industrial process safety systems in place',
        'Emergency shutoffs accessible on processing lines',
        'Dust extraction and suppression systems fitted',
      ],
    },
  },
  actionRequired: {
    common: [
      'Review hot work permit procedures',
      'Ensure staff training is current for hazardous processes',
    ],
    premises: {
      restaurant_cafe: [
        'Fit automatic suppression to deep fat fryers if missing',
        'Review flambe cooking procedures and training',
        'Ensure fire blankets are accessible at all cooking stations',
      ],
      warehouse: [
        'Implement or update hot work permit system',
        'Improve battery charging area ventilation',
        'Fit dust extraction where needed',
      ],
      food_manufacturing: [
        'Review industrial process safety systems',
        'Check dust extraction system adequacy',
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// SECTION 3: People at Risk
// ---------------------------------------------------------------------------

const ITEM_3_1: ItemChecklists = {
  // Staff
  finding: {
    common: [
      'Staff present during operating hours',
      'Lone workers present at times (opening/closing)',
      'Night shift or out-of-hours working occurs',
      'New or temporary staff may be unfamiliar with layout',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen staff working near heat and ignition sources',
        'Front-of-house staff spread across dining areas',
        'Delivery drivers accessing rear of premises',
      ],
      pub_bar: [
        'Bar staff working late hours with reduced staffing',
        'Cellar work involves lone working',
        'Live-in staff accommodation above or attached',
      ],
      hotel_bnb: [
        'Night reception staff (lone worker)',
        'Housekeeping staff throughout building during day',
        'Maintenance staff in plant rooms',
      ],
      warehouse: [
        'Warehouse operatives across large floor area',
        'Forklift drivers in aisles',
        'Office staff in mezzanine or separate area',
      ],
      food_manufacturing: [
        'Production line workers in process areas',
        'Quality control staff in laboratory areas',
        'Cleaning teams during and after shifts',
      ],
      office: [
        'Office workers on multiple floors',
        'Cleaners present outside normal hours',
        'Reception or security staff at entrance',
      ],
    },
  },
  existingControls: {
    common: [
      'Staff fire safety induction for all new starters',
      'Fire evacuation plan displayed and communicated',
      'Staff aware of nearest exits from their work areas',
      'Lone worker procedures in place',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen staff trained on fire blanket and suppression use',
        'Manager present during all trading hours',
      ],
      pub_bar: [
        'Minimum two staff on duty during opening hours',
        'Cellar work notification to colleague required',
      ],
      hotel_bnb: [
        'Night porter trained in emergency procedures',
        'Staff fire warden rota covers all shifts',
      ],
      warehouse: [
        'Tannoy or siren audible across full warehouse',
        'Forklift drivers trained in emergency procedures',
      ],
    },
  },
  actionRequired: {
    common: [
      'Update staff fire training records',
      'Review lone worker procedures',
      'Ensure all new starters receive fire induction within first week',
    ],
    premises: {},
  },
};

const ITEM_3_2: ItemChecklists = {
  // Public/visitors
  finding: {
    common: [
      'Members of the public access the premises regularly',
      'Visitors unfamiliar with building layout',
      'Delivery drivers and couriers access loading areas',
    ],
    premises: {
      restaurant_cafe: [
        'Customers seated throughout dining area during service',
        'Peak times see high occupancy (lunch/dinner service)',
        'Takeaway customers queuing near entrance',
        'Children accompanied by parents/guardians',
      ],
      pub_bar: [
        'High customer numbers during evenings and weekends',
        'Live music or event nights increase occupancy',
        'Beer garden users may be unaware of indoor fire exits',
        'Intoxicated customers may have impaired response',
      ],
      hotel_bnb: [
        'Guests unfamiliar with building, especially at night',
        'Conference or event attendees in function rooms',
        'International guests with language barriers',
      ],
      retail_shop: [
        'Customers throughout sales floor during trading hours',
        'Peak periods (weekends, sales, Christmas) increase occupancy',
        'Customers may be in changing rooms with limited visibility',
      ],
      warehouse: [
        'Limited public access, mainly delivery drivers',
        'Visitors by appointment only (trade counter excepted)',
      ],
      food_manufacturing: [
        'Limited public access, visitors escorted at all times',
        'Auditors and inspectors attend periodically',
      ],
      office: [
        'Clients and visitors at reception and meeting rooms',
        'Contractors accessing specific areas',
      ],
    },
  },
  existingControls: {
    common: [
      'Fire exit signage visible from all public areas',
      'Fire action notices displayed at key locations',
      'Visitors sign in at reception',
    ],
    premises: {
      restaurant_cafe: [
        'Staff guide evacuation during emergency',
        'Maximum occupancy not exceeded',
      ],
      pub_bar: [
        'Door staff manage occupancy during events',
        'Fire action notices displayed at all exits',
      ],
      hotel_bnb: [
        'Fire safety information in each guest room',
        'Guests informed of fire procedures at check-in',
        'Multilingual fire safety notices provided',
      ],
      retail_shop: [
        'Changing rooms have fire exit directions displayed',
        'Staff trained to guide customer evacuation',
      ],
    },
  },
  actionRequired: {
    common: [
      'Review public fire safety signage adequacy',
      'Update fire action notices at all exits',
      'Ensure visitor signing-in procedure captures location',
    ],
    premises: {
      pub_bar: [
        'Review event night occupancy management',
        'Train door staff on fire evacuation procedures',
      ],
      hotel_bnb: [
        'Provide multilingual fire notices if not already available',
        'Review check-in fire safety briefing procedure',
      ],
    },
  },
};

const ITEM_3_3: ItemChecklists = {
  // Contractors
  finding: {
    common: [
      'Contractors attend for maintenance and repairs',
      'Contractors may be unfamiliar with fire procedures',
      'Hot work by contractors occurs occasionally',
      'Cleaning contractors attend outside normal hours',
    ],
    premises: {
      restaurant_cafe: [
        'Extract cleaning and kitchen equipment servicing contractors',
        'Pest control contractors attend regularly',
      ],
      hotel_bnb: [
        'Maintenance contractors in guest areas during quiet periods',
        'Laundry service contractors attending premises',
      ],
      warehouse: [
        'Racking installation and maintenance contractors',
        'Forklift servicing engineers attend regularly',
      ],
      food_manufacturing: [
        'Equipment installation and maintenance engineers',
        'Specialist cleaning contractors for production areas',
      ],
    },
  },
  existingControls: {
    common: [
      'Contractor sign-in procedure with fire safety briefing',
      'Hot work permit system for relevant contractor work',
      'Contractors escorted or supervised in unfamiliar areas',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Review contractor induction and fire safety briefing',
      'Ensure hot work permits are consistently issued',
      'Provide fire exit information to all contractors on arrival',
    ],
    premises: {},
  },
};

const ITEM_3_4: ItemChecklists = {
  // Vulnerable persons
  finding: {
    common: [
      'No vulnerable persons regularly identified',
      'Elderly or mobility-impaired persons may visit',
      'Non-English speakers may attend premises',
      'Young persons present (under 18)',
    ],
    premises: {
      restaurant_cafe: [
        'Children in highchairs may impede escape routes',
        'Elderly customers may need assistance to evacuate',
        'Foreign tourists with language barriers',
      ],
      pub_bar: [
        'Intoxicated persons may have impaired response times',
        'Elderly regulars with mobility issues',
      ],
      hotel_bnb: [
        'Sleeping guests may be slow to respond to alarms',
        'International guests with limited English',
        'Guests with mobility or sensory impairments',
        'Families with young children',
      ],
      retail_shop: [
        'Customers with pushchairs may have restricted movement',
        'Elderly customers or those using mobility aids',
      ],
      warehouse: [
        'Few vulnerable persons expected in warehouse environment',
      ],
      office: [
        'Staff or visitors with mobility impairments',
        'Staff with hearing impairments may not hear alarm',
      ],
    },
  },
  existingControls: {
    common: [
      'Staff trained to assist vulnerable persons during evacuation',
      'Accessible escape routes maintained',
      'Visual fire alarm indicators provided for hearing-impaired',
    ],
    premises: {
      hotel_bnb: [
        'Accessible rooms available on ground floor',
        'Guest registration captures any special requirements',
        'PEEPs available for guests requiring assistance',
      ],
      office: [
        'PEEPs prepared for staff with known requirements',
        'Refuge areas identified and communicated',
      ],
    },
  },
  actionRequired: {
    common: [
      'Review provision for assisting vulnerable persons',
      'Ensure accessible escape routes are maintained',
      'Train staff on assisting persons with disabilities',
    ],
    premises: {
      hotel_bnb: [
        'Review guest registration for capturing special needs',
        'Ensure ground floor accessible rooms available',
      ],
    },
  },
};

const ITEM_3_5: ItemChecklists = {
  // Sleeping occupants (enhanced only)
  finding: {
    common: [
      'No sleeping accommodation on premises',
    ],
    premises: {
      pub_bar: [
        'Live-in accommodation above or behind pub',
        'Guest accommodation rooms (if applicable)',
      ],
      hotel_bnb: [
        'Guest bedrooms on multiple floors',
        'Sleeping guests unfamiliar with escape routes',
        'Guests may sleep deeply and be slow to respond to alarms',
        'Bedrooms above ground floor require protected escape route',
      ],
    },
  },
  existingControls: {
    common: [],
    premises: {
      hotel_bnb: [
        'Fire detection in all bedrooms (smoke/heat detectors)',
        'Fire alarm audible in all sleeping areas',
        'Emergency lighting in corridors from bedrooms to exits',
        'Fire doors to bedrooms are self-closing',
        'Fire safety information displayed in each room',
      ],
      pub_bar: [
        'Smoke detection in living accommodation',
        'Self-closing fire doors to accommodation area',
        'Private escape route from accommodation',
      ],
    },
  },
  actionRequired: {
    common: [],
    premises: {
      hotel_bnb: [
        'Test alarm audibility in all bedrooms',
        'Check self-closers on all bedroom fire doors',
        'Review escape route signage from bedrooms',
        'Ensure emergency lighting covers bedroom corridors',
      ],
      pub_bar: [
        'Check private escape route from accommodation is clear',
        'Test smoke detection in living quarters',
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// SECTION 4: Fire Prevention Measures
// ---------------------------------------------------------------------------

const ITEM_4_1: ItemChecklists = {
  // General housekeeping and waste management
  finding: {
    common: [
      'Good general housekeeping standards observed',
      'Waste accumulation noted in some areas',
      'External bins located near building',
      'Storage areas cluttered with combustible materials',
      'Escape routes kept clear of obstructions',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen grease build-up on surfaces and equipment',
        'Cardboard delivery packaging accumulating in storage',
        'Food waste bins overflowing or not emptied frequently',
        'Cleaning materials stored under sink near heat sources',
      ],
      pub_bar: [
        'Empty bottles and crates stored near building',
        'Beer garden furniture and umbrellas stored in corridors',
        'Cellar area cluttered with stock and equipment',
      ],
      hotel_bnb: [
        'Laundry accumulation in service corridors',
        'Guest room bins not emptied frequently enough',
        'Cleaning trolleys left in escape routes',
      ],
      warehouse: [
        'Pallet wrap and packaging waste in aisles',
        'Damaged stock creating combustible waste',
        'Skip or waste compound near loading bay',
      ],
      food_manufacturing: [
        'Production waste accumulation on processing floor',
        'Packaging materials in production areas',
        'Ingredient spillage and dust accumulation',
      ],
      office: [
        'Paper and cardboard recycling bins overflowing',
        'Under-desk clutter and cable tangles',
        'Kitchen/break room waste not emptied daily',
      ],
    },
  },
  existingControls: {
    common: [
      'Daily cleaning schedule in operation',
      'Waste removed from building at least daily',
      'External bins positioned away from building (2m+)',
      'Regular housekeeping inspections carried out',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen deep cleaned weekly',
        'Grease trap cleaned on schedule',
        'Delivery packaging broken down and removed daily',
      ],
      warehouse: [
        'Aisle clearance checks part of daily routine',
        'Skip compound gated and locked',
      ],
    },
  },
  actionRequired: {
    common: [
      'Improve waste removal frequency',
      'Relocate external bins further from building',
      'Declutter identified storage areas',
      'Implement housekeeping checklist for staff',
    ],
    premises: {
      restaurant_cafe: [
        'Schedule more frequent kitchen deep cleans',
        'Improve grease trap cleaning frequency',
      ],
    },
  },
};

const ITEM_4_2: ItemChecklists = {
  // Electrical safety
  finding: {
    common: [
      'PAT testing records available and current',
      'EICR completed within required period',
      'Overloaded sockets or multi-plug adaptors observed',
      'Damaged cables or plugs noted',
      'Extension leads used as permanent wiring',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen equipment on heavily loaded circuits',
        'Multiple appliances sharing single socket in kitchen',
        'Wet environment near electrical connections',
      ],
      pub_bar: [
        'Entertainment equipment (music system, TV) multi-plugged',
        'Cellar equipment on potentially damp circuits',
        'Temporary event electrical connections',
      ],
      hotel_bnb: [
        'Guest room USB/charging facilities adequate',
        'Laundry room high-powered equipment circuits',
        'Multiple guest-accessible sockets in rooms',
      ],
      warehouse: [
        'High-power machinery on dedicated circuits',
        'Temporary lighting or power in loading areas',
        'Forklift charging station electrical installation',
      ],
      food_manufacturing: [
        'Industrial three-phase equipment connections',
        'Washdown areas with waterproof electrical fittings',
        'Control panel maintenance and condition',
      ],
      office: [
        'Desk trunking and floor boxes in use',
        'Personal device charging creating load',
        'Server room electrical installation dedicated',
      ],
    },
  },
  existingControls: {
    common: [
      'Annual PAT testing programme in place',
      'EICR within the last 5 years',
      'Staff instructed not to overload sockets',
      'Damaged equipment reported and removed from use',
      'Fuses and MCBs appropriate for circuit loading',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Replace damaged cables and plugs immediately',
      'Remove multi-plug adaptors, install additional sockets',
      'Schedule PAT testing if overdue',
      'Arrange EICR if more than 5 years old',
      'Remove extension leads used as permanent wiring',
    ],
    premises: {},
  },
};

const ITEM_4_3: ItemChecklists = {
  // Heating systems
  finding: {
    common: [
      'Fixed central heating system (gas/electric)',
      'No portable heaters in use',
      'Portable heaters observed in occupied areas',
      'Adequate clearance maintained from combustibles',
      'Boiler room/plant room identified and inspected',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen area heated by cooking equipment',
        'Dining area heated by fixed radiators/HVAC',
        'Outdoor heaters at terrace or pavement seating',
      ],
      pub_bar: [
        'Open fire or log burner in public areas',
        'Gas patio heaters in beer garden',
        'Cellar temperature controlled by cooling system',
      ],
      hotel_bnb: [
        'Guest room heating controllable individually',
        'Central boiler serving all rooms',
        'Electric panel heaters in some rooms',
      ],
      warehouse: [
        'Warm air blower heaters at high level',
        'Radiant tube heaters in warehouse space',
        'Office areas heated separately',
      ],
      food_manufacturing: [
        'Process heat generating ambient warmth',
        'Cold store and chiller areas separately temperature-controlled',
      ],
      office: [
        'Central HVAC providing heating and cooling',
        'Under-desk heaters used by some staff',
      ],
    },
  },
  existingControls: {
    common: [
      'Gas safety certificate current (annual)',
      'Boiler serviced annually',
      'Portable heaters prohibited by policy',
      'Clearance maintained between heaters and combustibles',
    ],
    premises: {
      pub_bar: [
        'Fireguard around open fire',
        'Chimney swept annually',
        'Patio heaters chained for stability',
      ],
    },
  },
  actionRequired: {
    common: [
      'Renew gas safety certificate if overdue',
      'Service boiler/heating system if overdue',
      'Remove unauthorised portable heaters',
      'Ensure clearance from combustibles around all heaters',
    ],
    premises: {
      pub_bar: [
        'Arrange chimney sweep if overdue',
        'Install fireguard if not present',
      ],
    },
  },
};

const ITEM_4_4: ItemChecklists = {
  // Cooking equipment
  finding: {
    common: [
      'No commercial cooking on premises',
      'Basic kitchen/break room with kettle, microwave, toaster',
    ],
    premises: {
      restaurant_cafe: [
        'Commercial deep fat fryers in daily use',
        'Gas hob/range cookers on dedicated gas supply',
        'Commercial ovens (convection, pizza, tandoori)',
        'Charcoal grill or open-flame cooking equipment',
        'Kitchen extract canopy and ductwork installed',
        'Extract filters in place and cleaned regularly',
        'Fire suppression system installed over cooking range',
      ],
      pub_bar: [
        'Kitchen deep fat fryers for food service',
        'Glass washer and dishwasher in bar area',
        'Bar food warming/reheating equipment',
        'Kitchen extract system installed',
      ],
      hotel_bnb: [
        'Breakfast cooking facilities (toasters, grills, fryers)',
        'Guest kitchen or kitchenette facilities',
        'Room service preparation area',
      ],
      food_manufacturing: [
        'Industrial cooking and processing equipment',
        'Bulk deep frying operations',
        'Industrial ovens and baking lines',
        'Steam cooking and retort processing',
      ],
    },
  },
  existingControls: {
    common: [
      'Cooking equipment maintained and serviced',
      'Staff trained in safe use of cooking equipment',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen extract cleaned and serviced quarterly',
        'Extract grease filters cleaned weekly',
        'Automatic fire suppression over fryers/range (Ansul/similar)',
        'Deep fat fryer temperature limiters checked',
        'Fire blanket within 2m of cooking appliances',
        'Gas interlock system fitted to extract ventilation',
      ],
      pub_bar: [
        'Kitchen extract serviced regularly',
        'Fire blanket accessible in kitchen',
      ],
      food_manufacturing: [
        'Industrial safety systems on all cooking equipment',
        'Emergency shutdown procedures documented',
      ],
    },
  },
  actionRequired: {
    common: [
      'Service cooking equipment if maintenance overdue',
    ],
    premises: {
      restaurant_cafe: [
        'Schedule extract duct deep clean if overdue',
        'Install automatic fire suppression if not fitted',
        'Test gas interlock system',
        'Replace worn or expired fire blanket',
        'Check fryer temperature limiters are functional',
      ],
      pub_bar: [
        'Schedule kitchen extract cleaning',
        'Check fire blanket expiry and condition',
      ],
    },
  },
};

const ITEM_4_5: ItemChecklists = {
  // Smoking policy
  finding: {
    common: [
      'No smoking policy in force throughout premises',
      'Designated smoking area provided outside',
      'Smoking area has appropriate receptacles for materials',
      'No evidence of smoking in non-designated areas',
      'Smoking materials (butts, lighters) found in non-designated areas',
    ],
    premises: {
      restaurant_cafe: [
        'Outdoor dining area doubles as smoking area',
        'Smoking area near kitchen extract outlet',
      ],
      pub_bar: [
        'Beer garden designated as smoking area',
        'Smoking shelter provided at rear of premises',
        'Smokers congregating near building entrance',
      ],
      hotel_bnb: [
        'All rooms designated non-smoking',
        'Smoking area at building entrance or garden',
        'Guest compliance with no-smoking policy varies',
      ],
      warehouse: [
        'Smoking area away from loading bays and stock',
        'Smoking near flammable goods storage observed',
      ],
    },
  },
  existingControls: {
    common: [
      'No smoking signage displayed at all entrances',
      'Designated smoking area with fireproof receptacles',
      'Smoking area located away from building and exits',
      'Staff briefed on smoking policy during induction',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Provide fire-safe cigarette disposal receptacles',
      'Relocate smoking area further from building',
      'Replace missing no-smoking signage',
      'Enforce no smoking policy consistently',
    ],
    premises: {},
  },
};

const ITEM_4_6: ItemChecklists = {
  // Contractor and hot work controls
  finding: {
    common: [
      'Contractors attend for maintenance and repairs',
      'Hot work is occasionally required by contractors',
      'Hot work permit system in place',
      'No hot work permit system in operation',
    ],
    premises: {
      restaurant_cafe: [
        'Extract cleaning contractors use chemicals and tools',
        'Kitchen equipment engineers attend regularly',
      ],
      warehouse: [
        'Racking installation requires welding/cutting',
        'Building maintenance involves hot work on roof/structure',
      ],
      food_manufacturing: [
        'Engineering maintenance frequently requires hot work',
        'Equipment fabrication and modification on site',
      ],
    },
  },
  existingControls: {
    common: [
      'Hot work permit system documented and enforced',
      'Permit requires fire watch for 60 minutes post-work',
      'Contractors briefed on fire procedures before starting',
      'Appropriate extinguisher available during hot work',
      'Area cleared of combustibles before hot work begins',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Implement hot work permit system if not in place',
      'Train staff on issuing and managing hot work permits',
      'Review contractor fire safety induction process',
      'Ensure fire watch compliance after hot work completion',
    ],
    premises: {},
  },
};

const ITEM_4_7: ItemChecklists = {
  // Arson prevention
  finding: {
    common: [
      'External bins and skips positioned near building',
      'Building perimeter lighting adequate',
      'Building perimeter lighting inadequate or broken',
      'Unsecured external storage visible and accessible',
      'CCTV coverage of building exterior',
      'No CCTV coverage of building exterior',
      'Letter box or mail slot could allow introduction of fire',
    ],
    premises: {
      restaurant_cafe: [
        'Rear yard with bins accessible from public area',
        'Outdoor furniture stored near building overnight',
      ],
      pub_bar: [
        'Beer garden furniture left out overnight',
        'Empty bottle store accessible externally',
        'Late-night premises attracting antisocial behaviour',
      ],
      hotel_bnb: [
        'Car park areas adjacent to building',
        'Ground floor windows accessible from public area',
      ],
      warehouse: [
        'Large perimeter with multiple access points',
        'Loading bays may be left open during operations',
        'Pallets and waste stored externally near building',
      ],
      retail_shop: [
        'High street frontage with recessed doorway',
        'Delivery access at rear may be unsecured',
        'Shop front vulnerable to broken windows',
      ],
    },
  },
  existingControls: {
    common: [
      'External bins secured and positioned 5m+ from building',
      'Perimeter lighting maintained and operational',
      'CCTV covering building exterior',
      'Secure fencing around service yard',
      'Internal letter cage or fire-resistant letterbox',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Move bins and skips further from building',
      'Repair or install perimeter lighting',
      'Install or extend CCTV coverage',
      'Secure external storage areas',
      'Fit fire-resistant letterbox or internal cage',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// SECTION 5: Means of Escape
// ---------------------------------------------------------------------------

const ITEM_5_1: ItemChecklists = {
  // Escape routes
  finding: {
    common: [
      'All escape routes clear and unobstructed',
      'Obstruction found on escape route',
      'Escape routes adequately wide for occupancy',
      'Dead-end corridors identified',
      'Floor surfaces in good condition (not slippery or damaged)',
      'Escape routes adequately lit',
    ],
    premises: {
      restaurant_cafe: [
        'Tables and chairs restricting aisle width',
        'Kitchen escape route passes through food storage area',
        'Outdoor seating restricting access to fire exits',
      ],
      pub_bar: [
        'Bar area congested during peak times',
        'Beer garden route to assembly point unclear',
        'Cellar has limited escape (single stairway)',
      ],
      hotel_bnb: [
        'Corridor widths adequate for guest evacuation',
        'Escape from upper floors via protected staircase',
        'Guest room doors open into corridors (not blocking)',
      ],
      retail_shop: [
        'Display stands and racks narrowing aisles',
        'Stockroom escape route through congested storage',
      ],
      warehouse: [
        'Long travel distances across warehouse floor',
        'Racking aisles as escape routes',
        'Mezzanine level escape via single staircase',
      ],
      office: [
        'Corridor clear widths maintained',
        'Open-plan office with clear access to multiple exits',
      ],
    },
  },
  existingControls: {
    common: [
      'Escape routes inspected weekly',
      'No storage permitted in escape routes',
      'Minimum 1050mm clear width maintained',
      'Alternative escape routes available from all areas',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Clear identified obstructions from escape routes',
      'Widen escape routes where below minimum width',
      'Address dead-end escape route concerns',
      'Repair damaged floor surfaces on escape routes',
      'Implement regular escape route checks',
    ],
    premises: {},
  },
};

const ITEM_5_2: ItemChecklists = {
  // Travel distances
  finding: {
    common: [
      'Travel distances within acceptable limits',
      'Excessive travel distance identified in some areas',
      'Single direction travel distance within limits (18m max)',
      'Two-direction travel distance within limits (45m max)',
    ],
    premises: {
      warehouse: [
        'Long travel distances due to warehouse size',
        'Travel distance from centre of racking to nearest exit exceeds guidance',
      ],
      food_manufacturing: [
        'Production floor travel distances acceptable',
        'Cold store escape distance needs assessment',
      ],
    },
  },
  existingControls: {
    common: [
      'Exit locations minimise travel distances',
      'Intermediate exits provided to reduce travel distances',
      'Fire detection compensates for slightly extended travel distances',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Review travel distances and provide additional exits if needed',
      'Consider fire detection upgrade to compensate for travel distances',
      'Mark intermediate exits more clearly',
    ],
    premises: {},
  },
};

const ITEM_5_3: ItemChecklists = {
  // Exit doors
  finding: {
    common: [
      'All fire exit doors open in direction of escape',
      'Fire exit doors open easily without a key',
      'Panic hardware (push bars/pads) fitted to fire exits',
      'Fire exit doors in good condition (not warped or sticking)',
      'Electromagnetic locks fitted (release on fire alarm)',
      'Exit doors locked or obstructed from inside',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen fire exit opens to external area',
        'Main entrance serves as primary exit during trading',
        'Secondary exit from dining area available',
      ],
      pub_bar: [
        'Multiple exits from public bar area',
        'Emergency exit through beer garden',
        'Cellar exit to external area',
      ],
      hotel_bnb: [
        'Final exits from each staircase to outside',
        'Bedroom corridor exits to protected stairs',
        'Main entrance door serves as primary exit',
      ],
      retail_shop: [
        'Main customer entrance as primary exit',
        'Staff/delivery exit at rear of premises',
        'Roller shutter must not be sole means of exit',
      ],
      warehouse: [
        'Personnel doors adjacent to roller shutters',
        'Fire exits spaced around warehouse perimeter',
        'Loading bay doors not relied upon as fire exits',
      ],
    },
  },
  existingControls: {
    common: [
      'Panic hardware tested regularly',
      'Electromagnetic locks release on fire alarm activation',
      'Exit doors checked daily as part of opening routine',
      'Green running man exit signage above all fire exits',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Fit panic hardware to exit doors lacking it',
      'Replace or repair sticking/warped exit doors',
      'Ensure electromagnetic locks are linked to fire alarm',
      'Remove any chains or padlocks from fire exits',
      'Install exit signage where missing',
    ],
    premises: {},
  },
};

const ITEM_5_4: ItemChecklists = {
  // Emergency lighting
  finding: {
    common: [
      'Emergency lighting installed throughout escape routes',
      'Emergency lighting covers all exit doors and signs',
      'Battery-backed emergency luminaires observed',
      'Central battery emergency lighting system installed',
      'Areas identified without emergency lighting coverage',
      'Some emergency luminaires not illuminating on test',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen emergency lighting adequate',
        'Dining area emergency lighting adequate',
        'WC areas have emergency lighting',
      ],
      hotel_bnb: [
        'Guest bedroom corridors fully covered',
        'Emergency lighting in each staircase',
        'Reception and lobby emergency lighting adequate',
      ],
      warehouse: [
        'High-level emergency luminaires in warehouse space',
        'Emergency lighting at all personnel exit doors',
        'Mezzanine and staircase emergency lighting',
      ],
    },
  },
  existingControls: {
    common: [
      'Monthly flick test of emergency lighting carried out',
      'Annual 3-hour duration test completed',
      'Test records maintained in fire log book',
      'Failed luminaires replaced promptly',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Install emergency lighting in identified gap areas',
      'Replace failed emergency luminaires',
      'Carry out overdue monthly/annual testing',
      'Update emergency lighting test records',
    ],
    premises: {},
  },
};

const ITEM_5_5: ItemChecklists = {
  // Fire safety signage
  finding: {
    common: [
      'Green running man exit signs at all fire exits',
      'Directional arrow signs guiding to exits',
      'Fire action notices displayed at key locations',
      'Fire door keep shut signs on fire doors',
      'Missing or damaged signage identified',
      'Signage obstructed by furniture or stock',
    ],
    premises: {
      restaurant_cafe: [
        'Exit signs visible from all dining areas',
        'Kitchen fire exit signage adequate',
        'Fire action notices in staff areas',
      ],
      hotel_bnb: [
        'Exit signs visible from all guest room doors',
        'Floor plan evacuation signs on each floor',
        'Fire safety information in guest rooms',
      ],
      retail_shop: [
        'Exit signs visible above display units',
        'Staff areas have fire action notices',
      ],
      warehouse: [
        'Exit signs visible from all racking aisles',
        'High-level directional signs for large spaces',
      ],
    },
  },
  existingControls: {
    common: [
      'Signage checked during routine fire safety inspections',
      'Illuminated or photoluminescent exit signs installed',
      'Fire action notices updated with current procedures',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Replace missing or damaged fire safety signage',
      'Install additional directional signs where needed',
      'Update fire action notices with current information',
      'Ensure signage not obstructed by furniture or stock',
    ],
    premises: {},
  },
};

const ITEM_5_6: ItemChecklists = {
  // Assembly points
  finding: {
    common: [
      'Assembly point designated and signed',
      'Assembly point adequately sized for occupancy',
      'Assembly point location safe from building risk',
      'Assembly point not clearly defined or signed',
    ],
    premises: {
      restaurant_cafe: [
        'Assembly point in car park or pavement area',
        'Outdoor dining area doubles as assembly area',
      ],
      pub_bar: [
        'Assembly point in car park or across road',
        'Beer garden may serve as assembly area',
      ],
      hotel_bnb: [
        'Assembly point in car park, away from building',
        'Multiple assembly points for large premises',
      ],
      warehouse: [
        'Assembly point in car park, away from loading bays',
        'Assembly point accounts for HGV movements',
      ],
    },
  },
  existingControls: {
    common: [
      'Assembly point sign clearly visible',
      'All staff know assembly point location',
      'Roll call procedure at assembly point',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Install or replace assembly point signage',
      'Review assembly point size for occupancy',
      'Communicate assembly point to all staff and regular visitors',
      'Implement roll call procedure if not in place',
    ],
    premises: {},
  },
};

const ITEM_5_7: ItemChecklists = {
  // Vertical escape (enhanced only)
  finding: {
    common: [
      'Single storey premises - vertical escape not applicable',
    ],
    premises: {
      restaurant_cafe: [
        'Upper floor dining or function room with single staircase',
        'Basement kitchen or storage accessed by internal stairs',
      ],
      pub_bar: [
        'Upper floor function room or accommodation',
        'Cellar access via single internal staircase',
      ],
      hotel_bnb: [
        'Multiple floors with protected staircase(s)',
        'Staircase fire doors present and self-closing',
        'Staircase smoke ventilation provided (AOV/window)',
        'Refuge area identified on each floor',
      ],
      warehouse: [
        'Mezzanine accessed by single steel staircase',
        'Office above warehouse accessed via internal stair',
      ],
      office: [
        'Multiple floors served by protected staircases',
        'Staircase pressurisation or smoke ventilation present',
        'Refuge areas on each floor for wheelchair users',
      ],
    },
  },
  existingControls: {
    common: [
      'Staircases enclosed with fire-resisting construction',
      'Staircase fire doors self-closing and in good condition',
      'Emergency lighting in all staircases',
    ],
    premises: {
      hotel_bnb: [
        'AOV (automatic opening vent) at staircase head',
        'Smoke detectors on each landing',
        'Fire doors to bedrooms at each floor',
      ],
    },
  },
  actionRequired: {
    common: [
      'Repair or replace staircase fire doors not self-closing',
      'Install emergency lighting in staircases if missing',
      'Review staircase fire enclosure integrity',
    ],
    premises: {
      hotel_bnb: [
        'Test AOV smoke ventilation system',
        'Check refuge area provision and signage',
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// SECTION 6: Fire Detection & Warning
// ---------------------------------------------------------------------------

const ITEM_6_1: ItemChecklists = {
  // Fire alarm system type and category
  finding: {
    common: [
      'Conventional fire alarm panel installed',
      'Addressable fire alarm panel installed',
      'Wireless fire alarm system installed',
      'BS 5839 Category L1 (full coverage)',
      'BS 5839 Category L2 (coverage of escape routes + high-risk areas)',
      'BS 5839 Category L3 (coverage of escape routes only)',
      'BS 5839 Category M (manual call points only)',
      'No fire alarm system installed',
      'Grade D domestic system (mains-powered interconnected)',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen heat detectors on separate zone',
        'Dining area smoke detectors',
      ],
      hotel_bnb: [
        'System designed to BS 5839 Part 1 for sleeping risk',
        'Individual room detectors linked to main panel',
        'Bedroom sounder/alarm audibility confirmed',
      ],
      warehouse: [
        'Beam detectors or aspirating system for high ceilings',
        'Manual call points at exits only',
      ],
    },
  },
  existingControls: {
    common: [
      'Fire alarm system maintained to BS 5839',
      'Fire alarm panel in reception or staffed area',
      'Zone plan displayed at fire alarm panel',
      'Faults investigated and rectified promptly',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Upgrade fire alarm system if below required category',
      'Install fire alarm if none present',
      'Ensure zone plan is displayed at panel',
      'Arrange professional fire alarm assessment if unsure of category',
    ],
    premises: {},
  },
};

const ITEM_6_2: ItemChecklists = {
  // Detector types and locations
  finding: {
    common: [
      'Optical smoke detectors in escape routes',
      'Heat detectors in kitchens and plant rooms',
      'Multi-sensor detectors in occupied areas',
      'Detectors appear clean and unobstructed',
      'Missing detector heads or empty bases identified',
      'Detectors too close to air vents or light fittings',
    ],
    premises: {
      restaurant_cafe: [
        'Heat detectors in kitchen (not smoke - to avoid false alarms)',
        'Smoke detectors in dining area and storage rooms',
      ],
      hotel_bnb: [
        'Smoke or multi-sensor detectors in all bedrooms',
        'Heat detectors in guest kitchenettes',
        'Detectors in all corridors and landings',
      ],
      warehouse: [
        'Beam detectors spanning warehouse at high level',
        'Aspirating system in high-value storage areas',
        'Point detectors in offices and welfare areas',
      ],
    },
  },
  existingControls: {
    common: [
      'Detectors tested during weekly alarm test rotation',
      'Annual service includes all detector heads',
      'Detector locations recorded on system layout',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Replace missing detector heads',
      'Relocate detectors too close to vents',
      'Install additional detectors in uncovered areas',
      'Clean contaminated detector heads',
    ],
    premises: {},
  },
};

const ITEM_6_3: ItemChecklists = {
  // Manual call points
  finding: {
    common: [
      'Manual call points (break glass) at all exits',
      'Call points accessible and unobstructed',
      'Call points at 1.4m height as required',
      'Missing call point at identified exit',
      'Call point obstructed by furniture or signage',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Call points tested on weekly rotation',
      'Test records maintained in fire log book',
      'Replacement glass available for used call points',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Install call points at exits where missing',
      'Clear obstructions from call points',
      'Replace cracked or damaged call point units',
      'Begin weekly test programme if not already in place',
    ],
    premises: {},
  },
};

const ITEM_6_4: ItemChecklists = {
  // Alarm sounders
  finding: {
    common: [
      'Sounders audible throughout all areas of premises',
      'Areas identified where alarm may not be heard',
      'Visual alarm beacons installed for hearing-impaired',
      'No visual alarm beacons installed',
      'Alarm volume adequate over background noise',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen alarm may not be heard over extraction noise',
        'Dining area alarm audible over customer noise',
      ],
      pub_bar: [
        'Alarm may not be heard over music during live events',
        'Beer garden alarm coverage questionable',
        'Cellar alarm audibility confirmed',
      ],
      hotel_bnb: [
        'Alarm audible in all guest bedrooms (minimum 75dB)',
        'Vibrating pillow pads available for deaf guests',
      ],
      warehouse: [
        'Alarm sounders compete with machinery noise',
        'Visual beacons in noisy areas',
        'External loading bay alarm coverage',
      ],
    },
  },
  existingControls: {
    common: [
      'Alarm audibility tested during commissioning',
      'Sounders maintained as part of alarm service',
      'Visual beacons provided in high-noise areas',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Install additional sounders in areas with poor audibility',
      'Install visual alarm beacons where needed',
      'Test alarm audibility in all occupied areas',
      'Review alarm volume against background noise levels',
    ],
    premises: {},
  },
};

const ITEM_6_5: ItemChecklists = {
  // Testing and maintenance
  finding: {
    common: [
      'Weekly alarm test carried out and recorded',
      'Quarterly professional service visits',
      'Annual professional service and test',
      'Weekly test not being carried out regularly',
      'Service visits overdue',
      'Test records not up to date',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Weekly test regime on rotating call points',
      'Fire alarm service contract with approved contractor',
      'Quarterly visits for testing, annual for full service',
      'Fire log book maintained with all test records',
      'Faults reported to maintenance contractor promptly',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Implement weekly fire alarm test programme',
      'Arrange professional servicing contract if none in place',
      'Bring overdue service visits up to date',
      'Start maintaining fire log book for all tests',
      'Rectify any outstanding faults reported by engineer',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// SECTION 7: Firefighting Equipment
// ---------------------------------------------------------------------------

const ITEM_7_1: ItemChecklists = {
  // Extinguishers
  finding: {
    common: [
      'Water extinguishers provided for general combustible fires',
      'CO2 extinguishers provided near electrical equipment',
      'Foam extinguishers provided in general areas',
      'Powder extinguishers available',
      'Extinguishers mounted on brackets or stands',
      'Extinguishers accessible and unobstructed',
      'Extinguisher locations signed',
      'Insufficient extinguishers for floor area',
    ],
    premises: {
      restaurant_cafe: [
        'Wet chemical extinguisher near commercial kitchen',
        'CO2 extinguisher in kitchen for electrical fires',
        'Fire blanket within reach of cooking appliances',
      ],
      pub_bar: [
        'Wet chemical extinguisher in kitchen area',
        'CO2 extinguisher behind bar',
        'Water or foam extinguisher in public areas',
      ],
      hotel_bnb: [
        'Extinguishers on every floor landing',
        'Wet chemical in guest kitchen/breakfast area',
      ],
      warehouse: [
        'Extinguishers at regular intervals along escape routes',
        'Appropriate types for stored goods (foam for flammable liquids)',
      ],
      food_manufacturing: [
        'Wet chemical near cooking/frying equipment',
        'Foam extinguishers near oil storage',
        'CO2 near electrical panels and control rooms',
      ],
    },
  },
  existingControls: {
    common: [
      'Extinguishers serviced annually by competent person',
      'Monthly visual inspection recorded',
      'Extinguisher locations marked on fire plan',
      'Staff trained in extinguisher use',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange annual servicing if overdue',
      'Install additional extinguishers where coverage gaps identified',
      'Replace missing or discharged extinguishers',
      'Install extinguisher location signage',
      'Train staff on extinguisher selection and use',
    ],
    premises: {
      restaurant_cafe: [
        'Install wet chemical extinguisher near kitchen if missing',
      ],
    },
  },
};

const ITEM_7_2: ItemChecklists = {
  // Fire blankets
  finding: {
    common: [
      'Fire blankets provided in kitchen/cooking areas',
      'Fire blankets accessible and clearly signed',
      'Fire blanket missing or container empty',
      'No fire blankets on premises',
    ],
    premises: {
      restaurant_cafe: [
        'Fire blanket within 2m of deep fat fryer',
        'Fire blanket within 2m of hob/cooking range',
        'Multiple blankets in large commercial kitchen',
      ],
      pub_bar: [
        'Fire blanket in kitchen area',
        'Fire blanket behind bar if cooking facilities present',
      ],
      hotel_bnb: [
        'Fire blanket in breakfast preparation area',
        'Fire blanket in guest kitchen/kitchenette',
      ],
    },
  },
  existingControls: {
    common: [
      'Fire blankets to BS EN 1869 standard',
      'Inspected as part of annual extinguisher service',
      'Staff know location and how to use',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Install fire blankets near cooking equipment',
      'Replace missing or used fire blankets',
      'Train staff on fire blanket deployment',
    ],
    premises: {},
  },
};

const ITEM_7_3: ItemChecklists = {
  // Hose reels
  finding: {
    common: [
      'No hose reels installed',
      'Hose reels installed and accessible',
      'Hose reels present but not tested recently',
      'Dry riser inlet provided for fire service',
    ],
    premises: {
      hotel_bnb: [
        'Hose reels on each floor of multi-storey hotel',
        'Dry riser provided for fire service use',
      ],
      warehouse: [
        'Hose reels at intervals around warehouse perimeter',
      ],
    },
  },
  existingControls: {
    common: [
      'Hose reels tested annually',
      'Water supply adequate for hose reel demand',
      'Hose reel locations signed and accessible',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange annual testing of hose reels',
      'Check water supply pressure to hose reels',
      'Install signage for hose reel locations',
    ],
    premises: {},
  },
};

const ITEM_7_4: ItemChecklists = {
  // Fixed suppression
  finding: {
    common: [
      'No fixed suppression system installed',
      'Sprinkler system installed throughout premises',
      'Sprinkler system installed in specific high-risk areas only',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen fire suppression system (Ansul or similar) installed',
        'Kitchen suppression covers cooking range and fryers',
        'No kitchen fire suppression system installed',
      ],
      hotel_bnb: [
        'Full sprinkler system throughout building',
        'Sprinkler system in corridors and bedrooms',
      ],
      warehouse: [
        'In-rack sprinklers in high-bay racking',
        'Roof-level sprinklers across warehouse',
        'ESFR (Early Suppression Fast Response) sprinklers installed',
      ],
      food_manufacturing: [
        'Process area fire suppression system',
        'Kitchen/cooking area suppression system',
      ],
    },
  },
  existingControls: {
    common: [
      'Suppression system maintained and serviced',
      'System inspected quarterly and annually',
      'Water supply (tank/mains) adequate for system demand',
      'System activation linked to fire alarm panel',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange suppression system service if overdue',
      'Check system water supply adequacy',
      'Ensure system linked to fire alarm',
    ],
    premises: {
      restaurant_cafe: [
        'Install kitchen fire suppression system if not present',
        'Service kitchen suppression system (6-monthly)',
      ],
    },
  },
};

const ITEM_7_5: ItemChecklists = {
  // Annual servicing records
  finding: {
    common: [
      'All firefighting equipment serviced within last 12 months',
      'Service records available on site',
      'Some equipment overdue for annual service',
      'Service records not available or incomplete',
      'Equipment serviced by competent BS-accredited provider',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Annual service contract in place',
      'Service certificates held on file',
      'Defects rectified within 24 hours of report',
      'Monthly visual inspections supplement annual service',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange annual servicing for overdue equipment',
      'Set up service contract if not in place',
      'Locate or request copies of missing service records',
      'Begin monthly visual inspection programme',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// SECTION 8: Emergency Planning
// ---------------------------------------------------------------------------

const ITEM_8_1: ItemChecklists = {
  // Fire action plan
  finding: {
    common: [
      'Written fire action plan in place',
      'Fire action plan up to date',
      'Fire action plan not documented',
      'Fire action plan displayed at exits and key locations',
      'Fire action plan not displayed',
      'Plan includes instructions for discovering a fire',
      'Plan includes instructions for hearing the alarm',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Fire action plan reviewed annually',
      'Fire action notices at all final exits',
      'Plan communicated to all staff during induction',
      'Plan includes call 999, activate alarm, evacuate procedures',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Create written fire action plan',
      'Display fire action notices at all exits',
      'Review and update fire action plan',
      'Communicate plan to all current staff',
    ],
    premises: {},
  },
};

const ITEM_8_2: ItemChecklists = {
  // Evacuation procedure
  finding: {
    common: [
      'Simultaneous evacuation procedure in place',
      'Phased evacuation procedure in place',
      'Evacuation procedure appropriate for building type',
      'Coordination with fire service arrival documented',
    ],
    premises: {
      hotel_bnb: [
        'Phased or progressive evacuation for multi-storey',
        'Guest wake-up procedure for night-time evacuations',
        'Fire service information box at building entrance',
      ],
      warehouse: [
        'Evacuation accounts for all areas including racking aisles',
        'Sweep procedure for large floor area',
      ],
    },
  },
  existingControls: {
    common: [
      'Evacuation procedure documented and practiced',
      'Assembly point established and communicated',
      'Roll call procedure to account for all persons',
      'Fire service access and information provided',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Document evacuation procedure if not written',
      'Review evacuation type for building occupancy',
      'Practice evacuation procedure via fire drill',
      'Ensure fire service information is up to date',
    ],
    premises: {},
  },
};

const ITEM_8_3: ItemChecklists = {
  // Fire drills
  finding: {
    common: [
      'Fire drills conducted at least every 6 months',
      'Fire drill conducted within last 12 months',
      'Fire drill records available and up to date',
      'No fire drills conducted in over 12 months',
      'Fire drill outcomes reviewed and acted upon',
    ],
    premises: {
      hotel_bnb: [
        'Staff-only drills conducted regularly',
        'Night shift drill has been conducted',
        'Drill tested guest wake-up procedure',
      ],
    },
  },
  existingControls: {
    common: [
      'Drill schedule in place (minimum every 6 months)',
      'Drill records include date, time, evacuation time, issues',
      'Drill outcomes shared with all staff',
      'Issues from drills resolved before next drill',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Conduct fire drill as soon as possible',
      'Establish regular drill schedule (6-monthly minimum)',
      'Record and review drill outcomes',
      'Address issues identified in previous drills',
      'Conduct drill at different time/shift to test all staff',
    ],
    premises: {},
  },
};

const ITEM_8_4: ItemChecklists = {
  // Fire wardens/marshals
  finding: {
    common: [
      'Fire wardens designated and trained',
      'Sufficient wardens for building size and occupancy',
      'Fire wardens cover all shifts and areas',
      'No fire wardens designated',
      'Fire warden identification (hi-vis vest) available',
    ],
    premises: {
      restaurant_cafe: [
        'Manager acts as fire warden during trading hours',
        'Kitchen supervisor as fire warden for kitchen area',
      ],
      hotel_bnb: [
        'Fire wardens on each floor during staffed hours',
        'Night porter acts as fire warden out of hours',
      ],
      warehouse: [
        'Fire wardens cover all warehouse zones',
        'Shift leaders designated as fire wardens',
      ],
      office: [
        'Floor wardens designated for each floor',
        'Warden list displayed in reception and on each floor',
      ],
    },
  },
  existingControls: {
    common: [
      'Fire wardens trained and certificated',
      'Hi-vis vests or tabards provided for wardens',
      'Warden duties documented and understood',
      'Warden list kept up to date as staff change',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Designate fire wardens for all areas and shifts',
      'Arrange fire warden training',
      'Provide warden identification (hi-vis)',
      'Update warden list and communicate to all staff',
    ],
    premises: {},
  },
};

const ITEM_8_5: ItemChecklists = {
  // PEEPs (enhanced only)
  finding: {
    common: [
      'No persons requiring PEEPs currently identified',
      'Persons requiring assistance during evacuation identified',
      'PEEPs prepared for identified individuals',
      'PEEPs not in place despite identified need',
    ],
    premises: {
      hotel_bnb: [
        'Guest registration captures mobility/sensory needs',
        'Guests with needs allocated accessible rooms',
        'Buddy system available for guests requiring assistance',
      ],
      office: [
        'Staff with disabilities have current PEEPs',
        'Visitor PEEPs available as generic template',
        'Refuge areas identified on each floor',
      ],
    },
  },
  existingControls: {
    common: [
      'PEEPs reviewed regularly with individuals',
      'Buddy system or evacuation chair procedures in place',
      'Refuge areas identified and equipped with communication',
      'Fire service informed of refuge area locations',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Prepare PEEPs for all identified individuals',
      'Implement buddy system for evacuation assistance',
      'Identify and sign refuge areas',
      'Provide evacuation chairs where needed',
      'Review PEEPs with individuals annually',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// SECTION 9: Staff Training
// ---------------------------------------------------------------------------

const ITEM_9_1: ItemChecklists = {
  // Fire safety induction
  finding: {
    common: [
      'Fire safety induction given to all new starters',
      'Induction covers fire alarm, exits, extinguishers, procedures',
      'Induction not consistently delivered to all new starters',
      'No documented fire safety induction programme',
      'Agency or temporary staff receive fire briefing on arrival',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Documented induction checklist includes fire safety',
      'Induction completed within first day of employment',
      'Induction records signed by trainee and trainer',
      'Induction covers: alarm, exits, extinguisher locations, fire action plan',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Create fire safety induction programme if none exists',
      'Ensure all new starters receive induction on day one',
      'Include fire safety in documented induction checklist',
      'Brief all agency/temporary staff on arrival',
    ],
    premises: {},
  },
};

const ITEM_9_2: ItemChecklists = {
  // Ongoing refresher training
  finding: {
    common: [
      'Annual refresher fire training delivered to all staff',
      'Refresher training includes practical extinguisher use',
      'Refresher training overdue for some or all staff',
      'No refresher training programme in place',
      'Training records available for all staff',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Annual refresher scheduled for all staff',
      'Training includes theory and practical elements',
      'Training records maintained centrally',
      'External trainer or e-learning platform used',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Schedule annual refresher training for all staff',
      'Include practical extinguisher training in refreshers',
      'Maintain up-to-date training records for all staff',
      'Arrange overdue refresher training promptly',
    ],
    premises: {},
  },
};

const ITEM_9_3: ItemChecklists = {
  // Fire warden/marshal training
  finding: {
    common: [
      'All designated wardens have received formal training',
      'Warden training covers: sweep, check, report, coordinate',
      'Some wardens not yet trained or training expired',
      'No formal warden training provided',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Warden training delivered by accredited provider',
      'Training refreshed every 2-3 years',
      'Warden training certificates held on file',
      'Wardens practise their role during fire drills',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange formal warden training for untrained wardens',
      'Refresh expired warden training',
      'Ensure wardens participate in all fire drills',
      'Document warden training records',
    ],
    premises: {},
  },
};

const ITEM_9_4: ItemChecklists = {
  // Records of training
  finding: {
    common: [
      'Training records maintained for all fire safety training',
      'Records include date, content, attendees, trainer',
      'Training records incomplete or not available',
      'No training records maintained',
      'Training tracked in HR or training management system',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Training register maintained and up to date',
      'Certificates and sign-off sheets held centrally',
      'HR system tracks training completion and expiry',
      'Records available for inspection if requested',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Start maintaining fire training records',
      'Complete missing records retrospectively where possible',
      'Implement training tracking system',
      'Ensure records include all required details',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// SECTION 10: Maintenance & Testing
// ---------------------------------------------------------------------------

const ITEM_10_1: ItemChecklists = {
  // Fire alarm weekly testing
  finding: {
    common: [
      'Weekly fire alarm test carried out consistently',
      'Different call point tested each week (rotation)',
      'Test records maintained in fire log book',
      'Weekly test not being carried out',
      'Tests always use same call point (no rotation)',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Nominated person responsible for weekly test',
      'Test log maintained with date, call point, result',
      'Building occupants informed before test (to avoid panic)',
      'Faults reported to maintenance provider immediately',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Implement weekly fire alarm test programme',
      'Create call point rotation schedule',
      'Maintain fire log book for test records',
      'Nominate responsible person for weekly testing',
    ],
    premises: {},
  },
};

const ITEM_10_2: ItemChecklists = {
  // Emergency lighting testing
  finding: {
    common: [
      'Monthly function test (flick test) carried out',
      'Annual 3-hour duration test completed',
      'Emergency lighting test records up to date',
      'Monthly testing not being carried out',
      'Annual duration test overdue',
      'Failed luminaires identified during test',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Monthly function test on schedule',
      'Annual full duration test by competent person',
      'Test records maintained in fire log book',
      'Failed units replaced promptly',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Implement monthly emergency lighting test programme',
      'Arrange annual 3-hour duration test',
      'Replace identified failed luminaires',
      'Maintain test records in fire log book',
    ],
    premises: {},
  },
};

const ITEM_10_3: ItemChecklists = {
  // Fire extinguisher annual servicing
  finding: {
    common: [
      'All extinguishers serviced within last 12 months',
      'Service labels and dates visible on extinguishers',
      'Some extinguishers overdue for annual service',
      'Extended service (5-year overhaul) due on some units',
      'Extinguishers with no service label or date',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Annual service contract with BAFE-registered provider',
      'Service certificates held on file',
      'Monthly visual checks supplement annual service',
      'Discharge or damage reported immediately',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange annual service for overdue extinguishers',
      'Set up service contract if not in place',
      'Schedule 5-year extended service where due',
      'Start monthly visual inspection routine',
    ],
    premises: {},
  },
};

const ITEM_10_4: ItemChecklists = {
  // Fire door inspection
  finding: {
    common: [
      'Fire doors with self-closers close fully into frame',
      'Intumescent strips and smoke seals intact',
      'Fire door glazing intact and correctly rated',
      'Gaps around fire doors within acceptable limits',
      'Fire doors wedged or held open (no automatic closer)',
      'Self-closing devices broken or missing',
      'Fire doors with damage to leaf, frame, or hardware',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen fire door propped open during service',
        'Store room fire door not self-closing',
      ],
      pub_bar: [
        'Cellar door self-closer functional',
        'Fire doors between bar and accommodation (if applicable)',
      ],
      hotel_bnb: [
        'Bedroom fire doors self-closing and latching',
        'Corridor fire doors on all floors checked',
        'Staircase fire doors inspected',
      ],
      warehouse: [
        'Fire doors between warehouse and office areas',
        'Fire doors to plant rooms and electrical rooms',
      ],
    },
  },
  existingControls: {
    common: [
      'Fire doors checked quarterly',
      'Self-closers adjusted or replaced when faulty',
      'Wedges and props removed on discovery',
      'Hold-open devices linked to fire alarm (if fitted)',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Repair or replace faulty self-closing devices',
      'Replace damaged intumescent strips and smoke seals',
      'Remove all wedges and props from fire doors',
      'Install hold-open devices linked to fire alarm where needed',
      'Repair or replace damaged fire doors',
      'Implement quarterly fire door inspection schedule',
    ],
    premises: {},
  },
};

const ITEM_10_5: ItemChecklists = {
  // Sprinkler/suppression system maintenance
  finding: {
    common: [
      'No sprinkler or suppression system installed',
      'Sprinkler system maintained under service contract',
      'Suppression system service records available',
      'System maintenance overdue',
      'Sprinkler heads clear and unobstructed',
    ],
    premises: {
      restaurant_cafe: [
        'Kitchen suppression system (Ansul) serviced 6-monthly',
        'Kitchen suppression nozzles clear and correctly aimed',
      ],
      warehouse: [
        'In-rack sprinkler heads clear of stock obstruction',
        'Sprinkler water supply tank level and pump tested',
      ],
    },
  },
  existingControls: {
    common: [
      'Service contract in place for system maintenance',
      'Weekly visual inspection of sprinkler heads',
      'Quarterly valve and flow test',
      'Annual full system inspection and test',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Arrange system service if overdue',
      'Clear obstructions from sprinkler heads',
      'Test water supply and pump operation',
      'Set up service contract if not in place',
    ],
    premises: {},
  },
};

const ITEM_10_6: ItemChecklists = {
  // Record keeping
  finding: {
    common: [
      'Fire log book maintained on premises',
      'All tests, inspections, and servicing recorded',
      'Records available for inspection',
      'Fire log book incomplete or not maintained',
      'No fire log book on premises',
      'Records include dates, outcomes, and responsible person',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'Fire log book kept at reception or fire panel location',
      'Nominated responsible person maintains log',
      'Service certificates filed alongside log book',
      'Log reviewed by management periodically',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Purchase and start maintaining fire log book',
      'Nominate responsible person for fire log maintenance',
      'Compile all existing service records into log',
      'Review log book completeness and address gaps',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// SECTION 11: Dangerous Substances (DSEAR) — Enhanced Only
// ---------------------------------------------------------------------------

const ITEM_11_1: ItemChecklists = {
  // Identification of dangerous substances
  finding: {
    common: [
      'No dangerous substances identified on premises',
      'Dangerous substances present and identified',
    ],
    premises: {
      restaurant_cafe: [
        'Cooking gas (natural gas or LPG) supplied to kitchen',
        'Cleaning chemicals with flammable content',
        'Aerosol cans (cooking sprays, cleaning products)',
      ],
      pub_bar: [
        'CO2 and mixed gas cylinders in cellar',
        'Methylated spirits or cleaning solvents',
        'LPG cylinders for patio heaters',
      ],
      warehouse: [
        'Flammable liquids in stock (paints, solvents, aerosols)',
        'LPG cylinders for forklift trucks',
        'Cleaning chemicals and solvents',
        'Dust from stored products',
      ],
      food_manufacturing: [
        'Flour dust (explosive atmosphere risk)',
        'Cooking gas supply',
        'Cleaning and sanitising chemicals',
        'Refrigerant gases in cold stores',
      ],
    },
  },
  existingControls: {
    common: [
      'Dangerous substances register maintained',
      'Safety data sheets available for all substances',
      'Substances stored in original containers with labels',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Create dangerous substances register',
      'Obtain safety data sheets for all identified substances',
      'Review storage arrangements against SDS requirements',
    ],
    premises: {},
  },
};

const ITEM_11_2: ItemChecklists = {
  // Storage arrangements
  finding: {
    common: [
      'Flammable substances stored in ventilated area',
      'Bunded storage for flammable liquids',
      'Substances separated from ignition sources',
      'Storage arrangements inadequate for quantities held',
    ],
    premises: {
      pub_bar: [
        'Cellar gas cylinders secured upright in ventilated space',
        'LPG cylinders stored externally in caged compound',
      ],
      warehouse: [
        'Flammable liquid store with bunding and ventilation',
        'Aerosols stored below 50C in ventilated area',
        'LPG cylinder store external and caged',
      ],
      food_manufacturing: [
        'Chemical store with extraction ventilation',
        'Bulk gas storage in external compound',
      ],
    },
  },
  existingControls: {
    common: [
      'Storage per manufacturer and SDS requirements',
      'Bunding capacity at least 110% of largest container',
      'Incompatible substances stored separately',
      'Storage areas signed and access restricted',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Improve bunding for flammable liquid storage',
      'Provide ventilation to flammable substance stores',
      'Separate incompatible substances',
      'Sign and restrict access to storage areas',
    ],
    premises: {},
  },
};

const ITEM_11_3: ItemChecklists = {
  // Hazardous area classification
  finding: {
    common: [
      'No hazardous (explosive atmosphere) areas identified',
      'Hazardous area zones classified per DSEAR',
      'Areas where explosive atmospheres may form identified',
    ],
    premises: {
      pub_bar: [
        'Cellar gas room identified as hazardous area',
      ],
      warehouse: [
        'Flammable liquid store classified as hazardous zone',
        'LPG storage area classified',
      ],
      food_manufacturing: [
        'Flour handling areas classified for dust explosion risk',
        'Gas supply entry point classified',
      ],
    },
  },
  existingControls: {
    common: [
      'Hazardous area classification documented',
      'Appropriate electrical equipment in classified zones',
      'No ignition sources permitted in classified zones',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Classify hazardous areas per DSEAR requirements',
      'Ensure electrical equipment appropriate for zone classification',
      'Install signage for hazardous zones',
    ],
    premises: {},
  },
};

const ITEM_11_4: ItemChecklists = {
  // Control measures
  finding: {
    common: [
      'Ventilation adequate to prevent explosive atmosphere forming',
      'Electrical equipment suitable for hazardous zone',
      'Warning signage displayed at hazardous areas',
      'Control measures inadequate for risk level',
    ],
    premises: {
      pub_bar: [
        'Cellar gas detection and alarm system fitted',
        'Cellar ventilation adequate for gas volumes',
      ],
      warehouse: [
        'Extraction ventilation in flammable liquid store',
        'Anti-static measures in dust-prone areas',
      ],
      food_manufacturing: [
        'Dust extraction in flour handling areas',
        'Explosion venting or suppression fitted',
        'Earthing and bonding for static prevention',
      ],
    },
  },
  existingControls: {
    common: [
      'Ventilation systems maintained and tested',
      'Electrical equipment certified for zone',
      'Staff trained on dangerous substances risks',
      'Emergency procedures for substance releases documented',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Review ventilation adequacy for dangerous substances',
      'Verify electrical equipment ratings for zone',
      'Install or update hazardous area signage',
      'Train staff on dangerous substances procedures',
    ],
    premises: {},
  },
};

const ITEM_11_5: ItemChecklists = {
  // COSHH cross-reference
  finding: {
    common: [
      'COSHH assessments available for relevant substances',
      'COSHH assessments not available or out of date',
      'Cross-reference to Fire RA action items completed',
      'No COSHH assessments on premises',
    ],
    premises: {},
  },
  existingControls: {
    common: [
      'COSHH assessments reviewed annually',
      'Fire risk addressed within COSHH assessments',
      'Staff trained on COSHH findings and fire controls',
    ],
    premises: {},
  },
  actionRequired: {
    common: [
      'Complete COSHH assessments for all dangerous substances',
      'Cross-reference COSHH findings with Fire RA controls',
      'Update overdue COSHH assessments',
      'Train staff on COSHH and fire risk interface',
    ],
    premises: {},
  },
};

// ---------------------------------------------------------------------------
// MASTER REGISTRY
// ---------------------------------------------------------------------------

export const ITEM_CHECKLISTS: Record<string, ItemChecklists> = {
  '2.1': ITEM_2_1,
  '2.2': ITEM_2_2,
  '2.3': ITEM_2_3,
  '2.4': ITEM_2_4,
  '3.1': ITEM_3_1,
  '3.2': ITEM_3_2,
  '3.3': ITEM_3_3,
  '3.4': ITEM_3_4,
  '3.5': ITEM_3_5,
  '4.1': ITEM_4_1,
  '4.2': ITEM_4_2,
  '4.3': ITEM_4_3,
  '4.4': ITEM_4_4,
  '4.5': ITEM_4_5,
  '4.6': ITEM_4_6,
  '4.7': ITEM_4_7,
  '5.1': ITEM_5_1,
  '5.2': ITEM_5_2,
  '5.3': ITEM_5_3,
  '5.4': ITEM_5_4,
  '5.5': ITEM_5_5,
  '5.6': ITEM_5_6,
  '5.7': ITEM_5_7,
  '6.1': ITEM_6_1,
  '6.2': ITEM_6_2,
  '6.3': ITEM_6_3,
  '6.4': ITEM_6_4,
  '6.5': ITEM_6_5,
  '7.1': ITEM_7_1,
  '7.2': ITEM_7_2,
  '7.3': ITEM_7_3,
  '7.4': ITEM_7_4,
  '7.5': ITEM_7_5,
  '8.1': ITEM_8_1,
  '8.2': ITEM_8_2,
  '8.3': ITEM_8_3,
  '8.4': ITEM_8_4,
  '8.5': ITEM_8_5,
  '9.1': ITEM_9_1,
  '9.2': ITEM_9_2,
  '9.3': ITEM_9_3,
  '9.4': ITEM_9_4,
  '10.1': ITEM_10_1,
  '10.2': ITEM_10_2,
  '10.3': ITEM_10_3,
  '10.4': ITEM_10_4,
  '10.5': ITEM_10_5,
  '10.6': ITEM_10_6,
  '11.1': ITEM_11_1,
  '11.2': ITEM_11_2,
  '11.3': ITEM_11_3,
  '11.4': ITEM_11_4,
  '11.5': ITEM_11_5,
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Get merged checklist options (common + premises-specific) for an item field.
 */
export function getChecklistOptions(
  itemNumber: string,
  field: ChecklistField,
  premisesType: PremisesType
): string[] {
  const item = ITEM_CHECKLISTS[itemNumber];
  if (!item) return [];
  const fieldDef = item[field];
  if (!fieldDef) return [];
  const premisesSpecific = fieldDef.premises[premisesType] || [];
  return [...fieldDef.common, ...premisesSpecific];
}

/**
 * Create an initialized ChecklistFieldData for an item field.
 * All options start unchecked.
 */
export function createChecklistFieldData(
  itemNumber: string,
  field: ChecklistField,
  premisesType: PremisesType
): ChecklistFieldData {
  const labels = getChecklistOptions(itemNumber, field, premisesType);
  return {
    checklist: labels.map((label, idx) => ({
      id: `${field.charAt(0)}_${itemNumber}_${idx}`,
      label,
      checked: false,
      isCustom: false,
      aiSuggested: false,
    })),
    notes: '',
  };
}
