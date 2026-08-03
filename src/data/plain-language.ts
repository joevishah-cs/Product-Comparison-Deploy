/** Homeowner-friendly explanations for HVAC terms. Descriptions of what a metric
 *  means -- never a claim about any specific product. */
export const PLAIN_LANGUAGE: Record<string, string> = {
  initial_cost:
    "Relative price band recorded in the source, shown as dollar signs. More signs means the source placed the unit in a higher price band.",
  tonnage_options:
    "The unit sizes a model is sold in. One ton is roughly the cooling a typical 400-600 sq ft of home needs. More sizes means an installer can match your home more precisely.",
  chassis_type:
    "The shape of the outdoor unit. 'SD' is side-discharge -- a slim box that blows air sideways, so it fits tight side yards. 'Cube' blows air out of the top and needs clearance above.",
  footprint:
    "How much space the outdoor unit takes up, in inches: depth x width x height. Smaller matters when the unit has to fit down a narrow side yard.",
  air_handler_matchup:
    "The household electrical supply the matching indoor air handler can run on. A 115V option means it can plug into a standard household circuit instead of requiring a dedicated 240V circuit.",
  refrigerant:
    "The fluid that carries heat in and out of your home. Different refrigerants have different pressures, service procedures and global-warming potential.",
  compressor_type:
    "The pump at the heart of the system. Variable-speed (VS) compressors ramp up and down instead of switching fully on and off, which keeps temperature steadier and uses less electricity.",
  sound_blanket:
    "An insulating jacket wrapped around the compressor to muffle the sound it makes.",
  sound_level:
    "How loud the outdoor unit is, in decibels (dBA). Lower is quieter. A 10 dBA drop sounds roughly half as loud. 45 dBA is close to a quiet library; 60 dBA is close to normal conversation.",
  coil_only_matchup:
    "Whether the outdoor unit can be paired with just an indoor coil -- useful when you are keeping an existing furnace.",
  straight_cool:
    "Whether a cooling-only version is offered, for homes that heat some other way.",
  thermostat_type:
    "The kind of thermostat the system is designed around. A communicating thermostat exchanges detailed data with the equipment instead of just switching it on and off.",
  thermostat_24v:
    "Whether the system can run on a conventional 24-volt thermostat, which most existing homes already have wired.",
  regional_profiles:
    "Preconfigured setup profiles that tune airflow and humidity behaviour for a region's climate, so the installer does not have to dial it in by hand.",
  reusable_profiles:
    "Whether an installer can save a full set of system settings as a file and push it to the next install with one button.",
  charge_verification:
    "Whether a technician can confirm the refrigerant charge is correct without hooking up gauges. Correct charge is one of the biggest drivers of real-world efficiency.",
  slow_loss_alerting:
    "Whether the system notices a slow refrigerant leak and warns the contractor before you lose comfort or damage the compressor.",
  cloud_alerts:
    "Whether the system reports faults and diagnostics to the contractor over the internet in real time, so problems can be triaged before a truck rolls.",
  humidity_control:
    "True dehumidification -- running the compressor hard while keeping the indoor fan slow, so the coil pulls moisture out of the air instead of just cooling it.",
  base_pan_heater:
    "A heater in the base of the outdoor unit that keeps melted frost from re-freezing during winter operation.",
  heater_kit_3stage:
    "An optional electric backup heater with three output steps, so the system only uses as much backup heat as it needs.",
  intelligent_defrost:
    "Whether the system can keep delivering heat while it clears frost off the outdoor coil, instead of blowing cool air during the defrost cycle.",
  anticorrosive:
    "A protective coating on the outdoor coil that resists corrosion -- important near the coast or in industrial air.",
  energy_star: "Whether the model carries the U.S. EPA ENERGY STAR efficiency certification.",
  energy_star_cchp:
    "The ENERGY STAR cold-climate heat pump designation, awarded to models that hold up their heating output in genuinely cold weather.",
  cee_2025:
    "Whether the model meets the Consortium for Energy Efficiency's 2025 efficiency tier, which many utility rebates are tied to.",
  seer2:
    "Seasonal cooling efficiency. Higher is better -- it is roughly cooling delivered divided by electricity used across a season. Every point up is lower summer bills.",
  eer2:
    "Cooling efficiency measured at one hot design condition rather than across a season. Higher is better. It tells you how the system behaves on the hottest days.",
  hspf2:
    "Seasonal heating efficiency. Higher is better -- heating delivered divided by electricity used across a heating season.",
  cop_5f:
    "Coefficient of performance at 5°F outdoors. A COP of 2.0 means the system moves two units of heat for every one unit of electricity, even in cold weather. Higher is better.",
  cap_5f:
    "How much heat the unit can still deliver when it is 5°F outside, in BTU per hour. Higher means less reliance on expensive backup electric heat.",
  cap_47f:
    "Heating output at 47°F outdoors, the standard mild-weather rating point. Higher is more heat.",
  cap_95f:
    "Cooling output at 95°F outdoors, the standard hot-weather rating point. Higher is more cooling.",
  cap_115f:
    "Cooling output at 115°F outdoors -- extreme heat. Higher means the system holds up in a heat wave.",
  cooling_range:
    "The outdoor temperature band the manufacturer allows the unit to run in cooling mode.",
  heating_range:
    "The outdoor temperature band the manufacturer allows the unit to run in heating mode. A lower minimum means it keeps heating in colder weather.",
  line_length:
    "The maximum distance of refrigerant piping allowed between the outdoor and indoor units. Longer gives the installer more freedom in where the outdoor unit goes.",
  pre_charge:
    "How much line length comes already charged with refrigerant from the factory, before the installer has to add more.",
  elevation:
    "The maximum permitted height difference between the indoor and outdoor units.",
  warranty:
    "How long the manufacturer covers parts, and what happens if a major component fails. A replacement warranty means the unit is replaced rather than repaired.",

  /* Air-to-water (A2WHP) attributes */
  max_lwt:
    "The hottest water the heat pump can send out to your radiators or floor loops, in °F. Higher means it can drive older high-temperature radiators.",
  min_lwt:
    "The coolest water the heat pump is rated to leave with, in °F. A lower figure widens the range the system can cover.",
  heating_water_range:
    "The full span of leaving-water temperatures the unit is rated for in heating, from coolest to hottest.",
  cooling_water_range:
    "The span of chilled-water temperatures the unit is rated to produce in cooling.",
  dhw_water_range:
    "The span of water temperatures the unit is rated to produce when heating domestic hot water.",
  heating_ambient_range:
    "The outdoor air temperatures the unit is rated to heat in, from coldest to warmest.",
  cooling_ambient_range:
    "The outdoor air temperatures the unit is rated to cool in.",
  dhw_ambient_range:
    "The outdoor air temperatures the unit is rated to make domestic hot water in.",
  min_ambient_heating:
    "The coldest outdoor air temperature the unit is rated to keep heating in, in °F. Lower means it stays useful deeper into a cold snap.",
  max_ambient_heating:
    "The warmest outdoor air temperature the unit is rated to heat in, in °F.",
  min_ambient_cooling:
    "The coolest outdoor air temperature the unit is rated to cool in, in °F.",
  max_ambient_cooling:
    "The hottest outdoor air temperature the unit is rated to keep cooling in, in °F. Higher means it holds up better in extreme heat.",
  emitter_high_temp:
    "The water temperature available for high-temperature emitters -- traditional baseboard and cast-iron radiators, which need hot water to work.",

  heat_cap_a446w158:
    "Heating output in Btu/h at 44.6°F outdoor air while producing 158°F leaving water -- a demanding, high-temperature-radiator condition. Higher is more heat.",
  heat_cap_a446w131:
    "Heating output in Btu/h at 44.6°F outdoor air while producing 131°F leaving water. Higher is more heat.",
  heat_cap_a446w110:
    "Heating output in Btu/h at 44.6°F outdoor air while producing 110°F leaving water -- a low-temperature-emitter condition. Higher is more heat.",
  heat_cap_a446w95:
    "Heating output in Btu/h at 44.6°F outdoor air while producing 95°F leaving water, the mildest condition recorded. Higher is more heat.",
  heat_cap_a5w158:
    "Heating output in Btu/h at 5°F outdoor air while producing 158°F leaving water -- how much heat the unit still delivers on a genuinely cold day at a demanding water temperature. Higher is more heat.",
  heat_cap_a5w131:
    "Heating output in Btu/h at 5°F outdoor air while producing 131°F leaving water. Higher is more heat.",
  heat_cap_a5w110:
    "Heating output in Btu/h at 5°F outdoor air while producing 110°F leaving water. Higher is more heat.",
  heat_cap_a5w95:
    "Heating output in Btu/h at 5°F outdoor air while producing 95°F leaving water. Higher is more heat.",

  cop_a446w158:
    "Coefficient of performance at 44.6°F outdoor air producing 158°F water. A COP of 2.0 means the system moves two units of heat for every one unit of electricity. Higher is better.",
  cop_a446w131:
    "Coefficient of performance at 44.6°F outdoor air producing 131°F water. Higher is better.",
  cop_a446w110:
    "Coefficient of performance at 44.6°F outdoor air producing 110°F water. Higher is better.",
  cop_a446w95:
    "Coefficient of performance at 44.6°F outdoor air producing 95°F water. Higher is better.",
  cop_a5w158:
    "Coefficient of performance at 5°F outdoor air producing 158°F water -- efficiency at a demanding water temperature on a genuinely cold day. Higher is better.",
  cop_a5w131:
    "Coefficient of performance at 5°F outdoor air producing 131°F water. Higher is better.",
  cop_a5w110:
    "Coefficient of performance at 5°F outdoor air producing 110°F water. Higher means more heat delivered per unit of electricity in cold weather.",
  cop_a5w95:
    "Coefficient of performance at 5°F outdoor air producing 95°F water, the mildest water temperature recorded at this cold-weather condition. Higher is better.",

  cool_cap_a95w716:
    "Cooling output in Btu/h at 95°F outdoor air producing 71.6°F chilled water. Higher is more cooling.",
  cool_cap_a95w644:
    "Cooling output in Btu/h at 95°F outdoor air producing 64.4°F chilled water. Higher is more cooling.",
  cool_cap_a95w446:
    "Cooling output in Btu/h at 95°F outdoor air producing 44.6°F chilled water. Higher is more cooling.",
  eer_a95w716:
    "Cooling efficiency (Btu per watt-hour) at 95°F outdoor air producing 71.6°F chilled water. Higher is better.",
  eer_a95w644:
    "Cooling efficiency (Btu per watt-hour) at 95°F outdoor air producing 64.4°F chilled water. Higher is better.",
  eer_a95w446:
    "Cooling efficiency (Btu per watt-hour) at 95°F outdoor air producing 44.6°F chilled water. Higher is better.",

  outdoor_sound:
    "How loud the outdoor unit is, in decibels (dBA). Lower is quieter. A 10 dBA drop sounds roughly half as loud.",
  indoor_sound:
    "How loud the indoor hydronic unit is, in decibels (dBA). Lower is quieter.",

  outdoor_weight: "The weight of the outdoor unit, in pounds. Heavier units need a sturdier pad and more installers to set.",
  outdoor_dimensions: "The outdoor unit's height, width and depth in inches -- what has to fit the pad and the clearances.",
  indoor_weight: "The weight of the indoor hydronic unit, in pounds.",
  indoor_dimensions: "The indoor hydronic unit's height, width and depth in inches -- what has to fit the mechanical space.",

  backup_heater_cap:
    "The output of the electric backup heater built into the hydronic system, in kW. This is what covers the gap when the heat pump alone cannot meet the load.",
  backup_heater_phase: "The electrical phase (single or three) the backup heater requires.",
  backup_heater_freq: "The electrical frequency the backup heater is rated for, in Hz.",
  backup_heater_voltage: "The voltage the backup heater requires.",
  backup_heater_mop: "Maximum overcurrent protection for the backup heater circuit, in amps -- sets the breaker size.",
  backup_heater_mca: "Minimum circuit ampacity for the backup heater -- the minimum wire and breaker rating the installer must provide.",

  outdoor_phase: "The electrical phase (single or three) the outdoor unit requires.",
  outdoor_power_amps: "The electrical frequency the outdoor unit is rated for, in Hz.",
  outdoor_voltage: "The voltage the outdoor unit requires.",
  outdoor_mop: "Maximum overcurrent protection for the outdoor unit circuit, in amps -- sets the breaker size.",
  outdoor_mca: "Minimum circuit ampacity for the outdoor unit -- the minimum wire and breaker rating the installer must provide.",
  indoor_power_amps: "The indoor hydronic unit's rated current draw, in amps.",
};
