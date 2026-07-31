"""Generate A2WHP (Air-to-Water Heat Pump) source records from datasets-1/A2WHP Data Comparison.xlsx

Run with:  cd d:/Learning/market-intel && python datasets-1/generate-a2w-records.py

This script parses the A2W heat pump data and produces TypeScript source records
following the same HydronicSource pattern as the existing hydronic heat pump data.
"""
import json
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
    ('heat_cap_a446w158',    'Heating capacity @ A44.6°F/W158°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 3, 3, 'A3'),
    ('cop_a446w158',         'COP @ A44.6°F/W158°F',            'Efficiency', 'W/W',    'higher', 'measure', 4, 4, 'B4'),
    ('heat_cap_a446w131',    'Heating capacity @ A44.6°F/W131°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 5, 5, 'A5'),
    ('cop_a446w131',         'COP @ A44.6°F/W131°F',            'Efficiency', 'W/W',    'higher', 'measure', 6, 6, 'B6'),
    ('heat_cap_a446w110',    'Heating capacity @ A44.6°F/W110°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 7, 7, 'A7'),
    ('cop_a446w110',         'COP @ A44.6°F/W110°F',            'Efficiency', 'W/W',    'higher', 'measure', 8, 8, 'B8'),
    ('heat_cap_a446w95',     'Heating capacity @ A44.6°F/W95°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 9, 9, 'A9'),
    ('cop_a446w95',          'COP @ A44.6°F/W95°F',             'Efficiency', 'W/W',    'higher', 'measure', 10, 10, 'B10'),
    ('heat_cap_a5w158',      'Heating capacity @ A5°F/W158°F',   'Efficiency', 'kBtu/h', 'higher', 'measure', 11, 11, 'A11'),
    ('cop_a5w158',           'COP @ A5°F/W158°F',               'Efficiency', 'W/W',    'higher', 'measure', 12, 12, 'B12'),
    ('heat_cap_a5w131',      'Heating capacity @ A5°F/W131°F',   'Efficiency', 'kBtu/h', 'higher', 'measure', 13, 13, 'A13'),
    ('cop_a5w131',           'COP @ A5°F/W131°F',               'Efficiency', 'W/W',    'higher', 'measure', 14, 14, 'B14'),
    ('heat_cap_a5w110',      'Heating capacity @ A5°F/W110°F',   'Efficiency', 'kBtu/h', 'higher', 'measure', 15, 15, 'A15'),
    ('cop_a5w110',           'COP @ A5°F/W110°F',               'Efficiency', 'W/W',    'higher', 'measure', 16, 16, 'B16'),
    ('heat_cap_a5w95',       'Heating capacity @ A5°F/W95°F',    'Efficiency', 'kBtu/h', 'higher', 'measure', 17, 17, 'A17'),
    ('cop_a5w95',            'COP @ A5°F/W95°F',                'Efficiency', 'W/W',    'higher', 'measure', 18, 18, 'B18'),
    ('cool_cap_a95w716',     'Cooling capacity @ A95°F/W71.6°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 19, 19, 'A19'),
    ('eer_a95w716',          'EER @ A95°F/W71.6°F',             'Efficiency', 'Btu/Wh', 'higher', 'measure', 20, 20, 'B20'),
    ('cool_cap_a95w644',     'Cooling capacity @ A95°F/W64.4°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 21, 21, 'A21'),
    ('eer_a95w644',          'EER @ A95°F/W64.4°F',             'Efficiency', 'Btu/Wh', 'higher', 'measure', 22, 22, 'B22'),
    ('cool_cap_a95w446',     'Cooling capacity @ A95°F/W44.6°F', 'Efficiency', 'kBtu/h', 'higher', 'measure', 23, 23, 'A23'),
    ('eer_a95w446',          'EER @ A95°F/W44.6°F',             'Efficiency', 'Btu/Wh', 'higher', 'measure', 24, 24, 'B24'),

    # Indoor Unit block (Rows 25-38)
    ('indoor_height',        'Height (indoor unit)',             'Indoor Unit', 'in',     'none',   'measure', 26, 26, 'A26'),
    ('indoor_width',         'Width (indoor unit)',              'Indoor Unit', 'in',     'none',   'measure', 27, 27, 'A27'),
    ('indoor_depth',         'Depth (indoor unit)',              'Indoor Unit', 'in',     'none',   'measure', 28, 28, 'A28'),
    ('indoor_weight',        'Weight (indoor unit)',             'Indoor Unit', 'lbs',    'none',   'measure', 29, 29, 'B29'),
    ('indoor_sound',         'Sound pressure level (indoor)',    'Indoor Unit', 'dBA',    'lower',  'measure', 30, 30, 'B30'),
    ('indoor_power_amps',    'Power supply amperage',           'Indoor Unit', 'A',      'lower',  'measure', 32, 32, 'B32'),
    ('backup_heater_cap',    'Backup heater capacity',          'Indoor Unit', 'kW',     'none',   'measure', 33, 33, 'B33'),
    ('backup_heater_phase',  'Backup heater phase',             'Indoor Unit', '',       'none',   'text',    34, 34, 'B34'),
    ('backup_heater_freq',   'Backup heater frequency',         'Indoor Unit', 'Hz',     'none',   'measure', 35, 35, 'B35'),
    ('backup_heater_voltage','Backup heater voltage',           'Indoor Unit', 'V',      'none',   'measure', 36, 36, 'B36'),
    ('backup_heater_mop',    'Backup heater MOP',               'Indoor Unit', 'A',      'none',   'measure', 37, 37, 'B37'),
    ('backup_heater_mca',    'Backup heater MCA',               'Indoor Unit', 'A',      'none',   'measure', 38, 38, 'B38'),

    # Outdoor Unit block (Rows 39-52)
    ('outdoor_height',       'Height (outdoor unit)',            'Outdoor Unit', 'in',    'none',   'measure', 39, 39, 'A39'),
    ('outdoor_width',        'Width (outdoor unit)',             'Outdoor Unit', 'in',    'none',   'measure', 40, 40, 'A40'),
    ('outdoor_depth',        'Depth (outdoor unit)',             'Outdoor Unit', 'in',    'none',   'measure', 41, 41, 'A41'),
    ('outdoor_weight',       'Weight (outdoor unit)',            'Outdoor Unit', 'lbs',   'none',   'measure', 42, 42, 'B42'),
    ('refrigerant',          'Refrigerant type',                 'Outdoor Unit', '',      'none',   'text',    43, 43, 'B43'),
    ('compressor_type',      'Compressor type',                  'Outdoor Unit', '',      'none',   'text',    44, 44, 'B44'),
    ('outdoor_sound',        'Sound pressure level (outdoor)',   'Outdoor Unit', 'dBA',   'lower',  'measure', 47, 47, 'B47'),
    ('outdoor_power_amps',   'Power supply amperage',           'Outdoor Unit', 'A',     'lower',  'measure', 49, 49, 'B49'),
    ('max_lwt',              'Max leaving water temp',           'Outdoor Unit', '°F',    'higher', 'measure', 45, 45, 'D45'),
    ('min_lwt',              'Min leaving water temp',           'Outdoor Unit', '°F',    'higher', 'measure', 46, 46, 'D46'),
    ('outdoor_voltage',      'Outdoor unit voltage',            'Outdoor Unit', 'V',     'none',   'measure', 50, 50, 'B50'),
    ('outdoor_mop',          'Outdoor unit MOP',                'Outdoor Unit', 'A',     'none',   'measure', 51, 51, 'B51'),
    ('outdoor_mca',          'Outdoor unit MCA',                'Outdoor Unit', 'A',     'none',   'measure', 52, 52, 'B52'),
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
            'family': 'A2WHP' if brand == 'Daikin' else 'A2W',
        })

# Build attribute rows
a2w_rows = []
error_cells = []

for key, label, group, unit, direction, kind, row_start, row_end, hdr_ref in A2W_ATTRS:
    # Header is always in column A
    hdr = ws_v['A' + str(row_start)].value or label
    cells = []

    for col in A2W_PRODUCT_COLS:
        col_letter = chr(64 + col)
        ref = f'{col_letter}{row_start}'

        # Get formula value and data value
        fv = ws_f[ref].value
        vv = ws_v[ref].value

        is_formula = isinstance(fv, str) and fv.startswith('=')
        err = isinstance(vv, str) and vv.startswith('#')

        # Convert to string for consistency
        raw_val = None if vv is None else str(vv)

        cells.append({
            'ref': ref,
            'raw': raw_val,
            'formula': fv if is_formula else None,
            'error': bool(err),
        })

        if err:
            error_cells.append({'ref': ref, 'raw': vv})

    a2w_rows.append({
        'key': key,
        'label': label,
        'sourceLabel': str(hdr) if hdr is not None else label,
        'group': group,
        'unit': unit,
        'direction': direction,
        'kind': kind,
        'headerRef': 'A' + str(row_start),
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
