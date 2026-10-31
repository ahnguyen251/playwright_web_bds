import zipfile
import io
import os
import csv
import xml.sax.saxutils as saxutils

def escape_xml(s):
    if s is None:
        return ''
    # Remove control characters invalid in XML 1.0 except tab, CR, LF
    cleaned = ''.join(ch for ch in str(s) if ch in ('\t', '\n', '\r') or (ord(ch) >= 32 and ord(ch) <= 0xD7FF) or (ord(ch) >= 0xE000 and ord(ch) <= 0xFFFD))
    return saxutils.escape(cleaned)

def parse_markdown_cases(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    lines = text.splitlines()
    cases = []
    current_module = 'General'
    current_section = ''
    for line in lines:
        if line.startswith('# MODULE '):
            current_module = line.replace('# ', '').strip()
        elif line.startswith('## '):
            current_section = line.replace('## ', '').strip()
        elif line.startswith('| **TC-') or line.startswith('| TC-'):
            parts = [p.strip() for p in line.strip().split('|')[1:-1]]
            if len(parts) >= 6:
                tc_id = parts[0].replace('**', '').strip()
                title = parts[1].replace('**', '').strip()
                pre = parts[2].replace('<br>', '\n')
                data = parts[3].replace('<br>', '\n')
                steps = parts[4].replace('<br>', '\n')
                exp = parts[5].replace('<br>', '\n')
                cases.append({
                    'module': current_module,
                    'section': current_section,
                    'id': tc_id,
                    'title': title,
                    'preconditions': pre,
                    'testData': data,
                    'testSteps': steps,
                    'expectedResult': exp
                })
    return cases

def build_worksheet_xml(columns, rows_data):
    """
    columns: list of (header_title, width)
    rows_data: list of list of (cell_value, is_center)
    """
    col_xml_list = []
    for idx, (title, width) in enumerate(columns, 1):
        col_xml_list.append(f'<col min="{idx}" max="{idx}" width="{width}" customWidth="1"/>')
    cols_xml = '<cols>' + ''.join(col_xml_list) + '</cols>'

    row_xml_list = []
    # Header Row (Row 1)
    header_cells = []
    for c_idx, (title, width) in enumerate(columns, 1):
        col_letter = chr(64 + c_idx)
        header_cells.append(
            f'<c r="{col_letter}1" s="1" t="inlineStr"><is><t xml:space="preserve">{escape_xml(title)}</t></is></c>'
        )
    row_xml_list.append(f'<row r="1" ht="30" customHeight="1">{"".join(header_cells)}</row>')

    # Data Rows
    for r_idx, row_values in enumerate(rows_data, 2):
        is_zebra = (r_idx % 2 == 1)
        cell_xmls = []
        for c_idx, cell_item in enumerate(row_values, 1):
            col_letter = chr(64 + c_idx)
            if isinstance(cell_item, tuple):
                val, is_center = cell_item
            else:
                val, is_center = cell_item, False

            if is_center:
                s_idx = "5" if is_zebra else "4"
            else:
                s_idx = "3" if is_zebra else "2"

            escaped = escape_xml(val)
            cell_xmls.append(
                f'<c r="{col_letter}{r_idx}" s="{s_idx}" t="inlineStr"><is><t xml:space="preserve">{escaped}</t></is></c>'
            )
        row_xml_list.append(f'<row r="{r_idx}">{"".join(cell_xmls)}</row>')

    sheet_data = '<sheetData>' + ''.join(row_xml_list) + '</sheetData>'

    worksheet = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView tabSelected="0" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  {cols_xml}
  {sheet_data}
</worksheet>"""
    return worksheet

def generate_excel(cases, output_path):
    module_groups = {}
    for c in cases:
        mod_key = c['module']
        # Simplify module name for tab title
        if '01' in mod_key:
            sheet_title = '01. Authentication'
        elif '02' in mod_key:
            sheet_title = '02. Profile'
        elif '03' in mod_key:
            sheet_title = '03. Home'
        elif '04' in mod_key:
            sheet_title = '04. Ranking'
        elif '05' in mod_key:
            sheet_title = '05. Listings'
        elif '06' in mod_key:
            sheet_title = '06. Appointments'
        elif '07' in mod_key:
            sheet_title = '07. Transactions'
        elif '08' in mod_key:
            sheet_title = '08. Packages'
        elif '09' in mod_key:
            sheet_title = '09. Chat'
        else:
            sheet_title = mod_key[:31]

        module_groups.setdefault(sheet_title, []).append(c)

    # Master columns
    master_cols = [
        ('STT', 8),
        ('Phân hệ (Module)', 22),
        ('ID', 26),
        ('Test Case Title/Name', 38),
        ('Pre-conditions', 38),
        ('Test Data', 32),
        ('Test Steps', 55),
        ('Expected Result', 55)
    ]
    master_rows = []
    for idx, c in enumerate(cases, 1):
        mod_clean = c['module'].split(': ')[-1].split(' (')[0] if ': ' in c['module'] else c['module']
        master_rows.append([
            (str(idx), True),
            (mod_clean, False),
            (c['id'], True),
            (c['title'], False),
            (c['preconditions'], False),
            (c['testData'], False),
            (c['testSteps'], False),
            (c['expectedResult'], False)
        ])

    # Sub-sheet columns
    sub_cols = [
        ('STT', 8),
        ('ID', 26),
        ('Test Case Title/Name', 38),
        ('Pre-conditions', 38),
        ('Test Data', 32),
        ('Test Steps', 55),
        ('Expected Result', 55)
    ]

    sheets_to_create = [('Tất cả Test Cases', master_cols, master_rows)]

    for sheet_title, mod_cases in module_groups.items():
        sub_rows = []
        for idx, c in enumerate(mod_cases, 1):
            sub_rows.append([
                (str(idx), True),
                (c['id'], True),
                (c['title'], False),
                (c['preconditions'], False),
                (c['testData'], False),
                (c['testSteps'], False),
                (c['expectedResult'], False)
            ])
        sheets_to_create.append((sheet_title, sub_cols, sub_rows))

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml
        types_overrides = []
        for i in range(1, len(sheets_to_create) + 1):
            types_overrides.append(
                f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            )
        content_types = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  {''.join(types_overrides)}
</Types>"""
        z.writestr('[Content_Types].xml', content_types)

        # _rels/.rels
        rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""
        z.writestr('_rels/.rels', rels)

        # xl/_rels/workbook.xml.rels
        wb_rels_list = []
        for i in range(1, len(sheets_to_create) + 1):
            wb_rels_list.append(
                f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'
            )
        styles_rId = len(sheets_to_create) + 1
        wb_rels_list.append(
            f'<Relationship Id="rId{styles_rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        )
        wb_rels = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {''.join(wb_rels_list)}
</Relationships>"""
        z.writestr('xl/_rels/workbook.xml.rels', wb_rels)

        # xl/workbook.xml
        sheets_xml_list = []
        for i, (s_title, _, _) in enumerate(sheets_to_create, 1):
            sheets_xml_list.append(
                f'<sheet name="{escape_xml(s_title)}" sheetId="{i}" r:id="rId{i}"/>'
            )
        workbook = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    {''.join(sheets_xml_list)}
  </sheets>
</workbook>"""
        z.writestr('xl/workbook.xml', workbook)

        # xl/styles.xml
        styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font>
      <sz val="10"/>
      <name val="Segoe UI"/>
    </font>
    <font>
      <b/>
      <sz val="10.5"/>
      <color rgb="FFFFFFFF"/>
      <name val="Segoe UI"/>
    </font>
    <font>
      <b/>
      <sz val="10"/>
      <color rgb="FF1F497D"/>
      <name val="Segoe UI"/>
    </font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FF1F497D"/>
      </patternFill>
    </fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFF2F5F9"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFD9D9D9"/></left>
      <right style="thin"><color rgb="FFD9D9D9"/></right>
      <top style="thin"><color rgb="FFD9D9D9"/></top>
      <bottom style="thin"><color rgb="FFD9D9D9"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Header (Navy, White, Bold, Center) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 2: Regular Left Top -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="top" wrapText="1"/>
    </xf>
    <!-- 3: Zebra Left Top -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="top" wrapText="1"/>
    </xf>
    <!-- 4: Regular Center Top -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top" wrapText="1"/>
    </xf>
    <!-- 5: Zebra Center Top -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top" wrapText="1"/>
    </xf>
  </cellXfs>
</styleSheet>"""
        z.writestr('xl/styles.xml', styles)

        # Worksheets
        for i, (s_title, cols, rows) in enumerate(sheets_to_create, 1):
            sheet_content = build_worksheet_xml(cols, rows)
            z.writestr(f'xl/worksheets/sheet{i}.xml', sheet_content)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(buf.getvalue())

def generate_csv(cases, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['STT', 'Module', 'ID', 'Test Case Title/Name', 'Pre-conditions', 'Test Data', 'Test Steps', 'Expected Result'])
        for idx, c in enumerate(cases, 1):
            writer.writerow([
                idx,
                c['module'],
                c['id'],
                c['title'],
                c['preconditions'],
                c['testData'],
                c['testSteps'],
                c['expectedResult']
            ])

def main():
    md_file = 'document/Propify_Playwright_TestCases_Exact_Steps.md'
    xlsx_file = 'document/Propify_TestCases_Playwright.xlsx'
    csv_file = 'document/Propify_TestCases_Playwright.csv'

    cases = parse_markdown_cases(md_file)
    generate_excel(cases, xlsx_file)
    generate_csv(cases, csv_file)

    xlsx_size = os.path.getsize(xlsx_file)
    csv_size = os.path.getsize(csv_file)
    print(f"Export completed successfully!")
    print(f"Excel: {xlsx_file} ({xlsx_size} bytes)")
    print(f"CSV:   {csv_file} ({csv_size} bytes)")
    print(f"Total test cases exported: {len(cases)}")

if __name__ == '__main__':
    main()
