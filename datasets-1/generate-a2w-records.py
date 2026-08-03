"""Generate A2WHP (Air-to-Water Heat Pump) source records from datasets-1/A2WHP Data Comparison.xlsx

Run with:  cd d:/Learning/market-intel && python datasets-1/generate-a2w-records.py

This script parses the A2W heat pump data and produces TypeScript source records
following the same HydronicSource pattern as the existing hydronic heat pump data.
"""
import json
import re

import openpyxl

HERE = "."
XLSX = "datasets-1/A2WHP Data Comparison.xlsx"
OUT = "src/data/a2w-source-records.ts"

wb_f = openpyxl.load_workbook(XLSX, data_only=False)
wb_v = openpyxl.load_workbook(XLSX, data_only=True)
ws_f = wb_f.active
ws_v = wb_v.active

# Hardcoded product structure based on inspection:
# Row 2 headers: Col F-L are product names
# 7 products total across 3 brands (Daikin 2, Samsung 2, Mitsubishi 3)
A2W_PRODUCT_COLS = [6, 7, 8, 9, 10, 11, 12]  # F, G, H, I, J, K, L (1-indexed)
A2W_PRODUCT_ROWS = [2]  # Row 2 contains product model names

# Map product column indices to (brand, outdoor model, indoor model)
# Based on actual spreadsheet inspection
PRODUCT_METADATA = {
    6: ('Daikin', 'UPRA036DAVK', 'UTBX040EF6VJ'),
    7: ('Daikin', 'UPRA043DAVK', 'UTBX040EF6VJ'),
    8: ('Samsung', 'AE041FCYDCG/AA', 'AE055FEYMCG/AA'),
    9: ('Samsung', 'AE055FCYDCG/AA', 'AE055FEYMCG/AA'),
    10: ('Mitsubishi', 'WUZ-SA24NMZ', 'ERSF-NM6E'),
    11: ('Mitsubishi', 'WUZ-SA36NMZ', 'ERSF-NM6E'),
    12: ('Mitsubishi', 'WUZ-SA48NMZ', 'ERSF-NM6E'),
}

# Attribute definitions with direction and kind
# Format: (key, label, group, unit, direction, kind, row_range_start, row_range_end, source_header_cell)
A2W_ATTRS = [
    # Efficiency data block (Rows 3-24, ~22 rows of capacity/COP/EER across 8 AHRI conditions)
    ('heat_cap_a446w158',    'Heating capacity @ A44.6°F/W158°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 3, 3, 'A3'),
    ('cop_a446w158',         'COP @ A44.6°F/W158°F',            'Efficiency', 'W/W',    'higher', 'measure', 4, 4, 'B4'),
    ('heat_cap_a446w131',    'Heating capacity @ A44.6°F/W131°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 5, 5, 'A5'),
    ('cop_a446w131',         'COP @ A44.6°F/W131°F',            'Efficiency', 'W/W',    'higher', 'measure', 6, 6, 'B6'),
    ('heat_cap_a446w110',    'Heating capacity @ A44.6°F/W110°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 7, 7, 'A7'),
    ('cop_a446w110',         'COP @ A44.6°F/W110°F',            'Efficiency', 'W/W',    'higher', 'measure', 8, 8, 'B8'),
    ('heat_cap_a446w95',     'Heating capacity @ A44.6°F/W95°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 9, 9, 'A9'),
    ('cop_a446w95',          'COP @ A44.6°F/W95°F',             'Efficiency', 'W/W',    'higher', 'measure', 10, 10, 'B10'),
    ('heat_cap_a5w158',      'Heating capacity @ A5°F/W158°F',   'Efficiency', 'Btu/h', 'higher', 'measure', 11, 11, 'A11'),
    ('cop_a5w158',           'COP @ A5°F/W158°F',               'Efficiency', 'W/W',    'higher', 'measure', 12, 12, 'B12'),
    ('heat_cap_a5w131',      'Heating capacity @ A5°F/W131°F',   'Efficiency', 'Btu/h', 'higher', 'measure', 13, 13, 'A13'),
    ('cop_a5w131',           'COP @ A5°F/W131°F',               'Efficiency', 'W/W',    'higher', 'measure', 14, 14, 'B14'),
    ('heat_cap_a5w110',      'Heating capacity @ A5°F/W110°F',   'Efficiency', 'Btu/h', 'higher', 'measure', 15, 15, 'A15'),
    ('cop_a5w110',           'COP @ A5°F/W110°F',               'Efficiency', 'W/W',    'higher', 'measure', 16, 16, 'B16'),
    ('heat_cap_a5w95',       'Heating capacity @ A5°F/W95°F',    'Efficiency', 'Btu/h', 'higher', 'measure', 17, 17, 'A17'),
    ('cop_a5w95',            'COP @ A5°F/W95°F',                'Efficiency', 'W/W',    'higher', 'measure', 18, 18, 'B18'),
    ('cool_cap_a95w716',     'Cooling capacity @ A95°F/W71.6°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 19, 19, 'A19'),
    ('eer_a95w716',          'EER @ A95°F/W71.6°F',             'Efficiency', 'Btu/Wh', 'higher', 'measure', 20, 20, 'B20'),
    ('cool_cap_a95w644',     'Cooling capacity @ A95°F/W64.4°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 21, 21, 'A21'),
    ('eer_a95w644',          'EER @ A95°F/W64.4°F',             'Efficiency', 'Btu/Wh', 'higher', 'measure', 22, 22, 'B22'),
    ('cool_cap_a95w446',     'Cooling capacity @ A95°F/W44.6°F', 'Efficiency', 'Btu/h', 'higher', 'measure', 23, 23, 'A23'),
    ('eer_a95w446',          'EER @ A95°F/W44.6°F',             'Efficiency', 'Btu/Wh', 'higher', 'measure', 24, 24, 'B24'),

    # Indoor Unit block. Row 25 = indoor model names, 26 = H x W x D (one cell),
    # 27 = weight, 28 = sound, 29 = unit power supply, 30-35 = backup heater.
    ('indoor_dimensions',    'Dimensions (indoor unit)',         'Indoor Unit', 'in',     'none',   'text',    26, 26, 'A26'),
    ('indoor_weight',        'Weight (indoor unit)',             'Indoor Unit', 'lbs',    'none',   'measure', 27, 27, 'A27'),
    ('indoor_sound',         'Sound pressure level (indoor)',    'Indoor Unit', 'dBA',    'lower',  'measure', 28, 28, 'A28'),
    ('indoor_power_amps',    'Power supply amperage (indoor)',   'Indoor Unit', 'A',      'lower',  'measure', 29, 29, 'A29'),
    ('backup_heater_cap',    'Backup heater capacity',           'Indoor Unit', 'kW',     'none',   'text',    30, 30, 'A30'),
    ('backup_heater_phase',  'Backup heater phase',              'Indoor Unit', '',       'none',   'text',    31, 31, 'B31'),
    ('backup_heater_freq',   'Backup heater frequency',          'Indoor Unit', 'Hz',     'none',   'measure', 32, 32, 'B32'),
    ('backup_heater_voltage','Backup heater voltage',            'Indoor Unit', 'V',      'none',   'text',    33, 33, 'B33'),
    ('backup_heater_mop',    'Backup heater MOP',                'Indoor Unit', 'A',      'none',   'measure', 34, 34, 'B34'),
    ('backup_heater_mca',    'Backup heater MCA',                'Indoor Unit', 'A',      'none',   'measure', 35, 35, 'B35'),

    # Outdoor Unit block. Row 36 = outdoor model names, 37 = H x W x D, 38 = weight,
    # 39 = refrigerant, 40 = compressor, 41-46 = operation ranges, 47 = sound, 48-52 = power.
    ('outdoor_dimensions',   'Dimensions (outdoor unit)',        'Outdoor Unit', 'in',    'none',   'text',    37, 37, 'A37'),
    ('outdoor_weight',       'Weight (outdoor unit)',            'Outdoor Unit', 'lbs',   'none',   'measure', 38, 38, 'A38'),
    ('refrigerant',          'Refrigerant',                      'Outdoor Unit', '',      'none',   'text',    39, 39, 'A39'),
    ('compressor_type',      'Compressor type',                  'Outdoor Unit', '',      'none',   'text',    40, 40, 'A40'),

    # Operation ranges. Ambient rows carry the outdoor air envelope; water-side rows
    # carry the leaving-water envelope that max_lwt / min_lwt are derived from.
    ('heating_ambient_range','Outdoor ambient range (heating)',  'Operation Range', '°F', 'range',  'range',   41, 41, 'A41'),
    ('heating_water_range',  'Leaving water range (heating)',    'Operation Range', '°F', 'range',  'range',   42, 42, 'A42'),
    ('cooling_ambient_range','Outdoor ambient range (cooling)',  'Operation Range', '°F', 'range',  'range',   43, 43, 'A43'),
    ('cooling_water_range',  'Leaving water range (cooling)',    'Operation Range', '°F', 'range',  'range',   44, 44, 'A44'),
    ('dhw_ambient_range',    'Outdoor ambient range (DHW)',      'Operation Range', '°F', 'range',  'range',   45, 45, 'A45'),
    ('dhw_water_range',      'Leaving water range (DHW)',        'Operation Range', '°F', 'range',  'range',   46, 46, 'A46'),

    ('outdoor_sound',        'Sound pressure level (outdoor)',   'Outdoor Unit', 'dBA',   'lower',  'measure', 47, 47, 'A47'),
    ('outdoor_phase',        'Outdoor unit phase',               'Outdoor Unit', '',      'none',   'text',    48, 48, 'B48'),
    ('outdoor_power_amps',   'Power supply frequency (outdoor)', 'Outdoor Unit', 'Hz',    'none',   'measure', 49, 49, 'B49'),
    ('outdoor_voltage',      'Outdoor unit voltage',             'Outdoor Unit', 'V',     'none',   'text',    50, 50, 'B50'),
    ('outdoor_mop',          'Outdoor unit MOP',                 'Outdoor Unit', 'A',     'none',   'measure', 51, 51, 'B51'),
    ('outdoor_mca',          'Outdoor unit MCA',                 'Outdoor Unit', 'A',     'none',   'measure', 52, 52, 'B52'),
]

# max_lwt / min_lwt are not their own spreadsheet rows -- they are the two bounds of
# the heating water-side range (row 42, "Water side  Min ~ Max"). Emitting them as
# derived rows keeps the attribute keys the UI already consumes while sourcing the
# numbers from the correct cells.
DERIVED_FROM_RANGE = [
    # A higher max LWT retrofits onto existing high-temp emitters; a lower min LWT
    # widens the usable range, so the two bounds score in opposite directions.
    ('max_lwt', 'Max leaving water temp', '°F', 'higher', 42, 'max'),
    ('min_lwt', 'Min leaving water temp', '°F', 'lower', 42, 'min'),
    # Outdoor-air envelope. The cold-climate card ranks on the minimum heating
    # ambient; the cooling card ranks on the cooling ambient bounds.
    ('min_ambient_heating', 'Min outdoor ambient (heating)', '°F', 'lower', 41, 'min'),
    ('max_ambient_heating', 'Max outdoor ambient (heating)', '°F', 'higher', 41, 'max'),
    ('min_ambient_cooling', 'Min outdoor ambient (cooling)', '°F', 'lower', 43, 'min'),
    ('max_ambient_cooling', 'Max outdoor ambient (cooling)', '°F', 'higher', 43, 'max'),
]

# Build product list
a2w_products = []
for col in A2W_PRODUCT_COLS:
    if col in PRODUCT_METADATA:
        brand, outdoor_model, indoor_model = PRODUCT_METADATA[col]
        a2w_products.append({
            'rowRefs': [f'{chr(64+col)}2'],  # e.g., 'F2'
            'sourceHeader': f"{outdoor_model} + {indoor_model}",
            'brand': brand,
            'model': outdoor_model,
            # Every model in this sheet is an air-to-water heat pump, so they share
            # one family label. Splitting Daikin out as "A2WHP" and competitors as
            # "A2W" made the family filter look like two product categories.
            'family': 'A2WHP',
        })

# Build attribute rows
a2w_rows = []
error_cells = []

def source_label(row):
    """The sheet spreads a row's label across columns A-D (block name, sub-label,
    axis, 'Min ~ Max'). Column A is blank on continuation rows, so join whatever
    label columns carry text for that row."""
    parts = []
    for col in ('A', 'B', 'C', 'D'):
        v = ws_v[f'{col}{row}'].value
        if v is None:
            continue
        v = str(v).replace('\n', ' ').strip()
        if v:
            parts.append(v)
    return ' '.join(parts)


def read_cells(row):
    cells = []
    for col in A2W_PRODUCT_COLS:
        ref = f'{chr(64 + col)}{row}'
        fv = ws_f[ref].value
        vv = ws_v[ref].value
        is_formula = isinstance(fv, str) and fv.startswith('=')
        err = isinstance(vv, str) and vv.startswith('#')
        cells.append({
            'ref': ref,
            'raw': None if vv is None else str(vv),
            'formula': fv if is_formula else None,
            'error': bool(err),
        })
        if err:
            error_cells.append({'ref': ref, 'raw': vv})
    return cells


for key, label, group, unit, direction, kind, row_start, row_end, hdr_ref in A2W_ATTRS:
    a2w_rows.append({
        'key': key,
        'label': label,
        'sourceLabel': source_label(row_start) or label,
        'group': group,
        'unit': unit,
        'direction': direction,
        'kind': kind,
        'headerRef': 'A' + str(row_start),
        'cells': read_cells(row_start),
    })

# Split the heating water-side range into the max_lwt / min_lwt scalars the UI reads.
RANGE_SPLIT = re.compile(r'^\s*(-?[\d.]+)\s*~\s*(-?[\d.]+)\s*$')

for key, label, unit, direction, row, bound in DERIVED_FROM_RANGE:
    cells = []
    for cell in read_cells(row):
        raw = cell['raw']
        m = RANGE_SPLIT.match(raw) if raw else None
        if m:
            lo, hi = m.group(1), m.group(2)
            raw = hi if bound == 'max' else lo
        else:
            raw = None
        cells.append({
            'ref': cell['ref'],
            'raw': raw,
            'formula': cell['formula'],
            'error': cell['error'],
        })
    a2w_rows.append({
        'key': key,
        'label': label,
        'sourceLabel': label,
        'group': 'Operation Range',
        'unit': unit,
        'direction': direction,
        'kind': 'measure',
        'headerRef': 'A' + str(row),
        'cells': cells,
    })

payload = {
    'products': a2w_products,
    'rows': a2w_rows,
    'errorCells': error_cells,
}

def ts(obj, indent=0):
    return json.dumps(obj, ensure_ascii=False, indent=2)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* AUTO-GENERATED from datasets-1/A2WHP Data Comparison.xlsx. Do not edit by hand.\n')
    f.write(' * Sources: A2WHP Data Comparison sheet.\n')
    f.write(' * Raw source text, cell provenance, and formula-error flags are preserved. */\n\n')
    f.write('import type { HydronicSource } from "./types";\n\n')
    f.write('export const A2W: HydronicSource = ' + ts(payload) + ' as HydronicSource;\n')

print(f'Wrote {OUT}')
print(f'Products: {len(a2w_products)} | Rows: {len(a2w_rows)} | Error cells: {len(error_cells)}')
