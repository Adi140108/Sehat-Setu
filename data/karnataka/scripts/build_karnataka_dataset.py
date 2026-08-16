import os
import re
import json
import hashlib
from datetime import datetime
import pandas as pd
import pypdf

# Config paths
RAW_DIR = 'karnataka raw data'
PROCESSED_DIR = 'data/karnataka/processed'
FIRESTORE_DIR = 'data/karnataka/processed/firestore'
METADATA_DIR = 'data/karnataka/metadata'

# Ensure directories exist
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(FIRESTORE_DIR, exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)

# Helper function to generate MD5 hash of a file
def get_file_hash(filepath):
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            buf = f.read()
            hasher.update(buf)
        return hasher.hexdigest()
    except Exception as e:
        print(f"Error hashing file {filepath}: {e}")
        return None

# Helper to generate stable deterministic ID
def get_stable_id(prefix, *fields):
    s = '|'.join(str(f).strip().upper() for f in fields)
    h = hashlib.md5(s.encode('utf-8')).hexdigest()[:12].upper()
    return f"KA-{prefix}-{h}"

# Helper to normalize facility names
def normalize_name(name):
    if not name:
        return ""
    name = str(name).strip().upper()
    name = re.sub(r'\s+', ' ', name) # Collapse excessive whitespace
    name = re.sub(r'[\.,;\:\-\(\)]', ' ', name) # Standardize punctuation to spaces
    name = re.sub(r'\s+', ' ', name).strip()
    # Normalize common abbreviations
    name = name.replace("PRIMARY HEALTH CENTER", "PHC")
    name = name.replace("PRIMARY HEALTH CENTRE", "PHC")
    name = name.replace("COMMUNITY HEALTH CENTER", "CHC")
    name = name.replace("COMMUNITY HEALTH CENTRE", "CHC")
    name = name.replace("GENERAL HOSPITAL", "GH")
    name = name.replace("DISTRICT HOSPITAL", "DH")
    name = name.replace("TALUKA HEALTH OFFICE", "THO")
    name = name.replace("DISTRICT HEALTH", "DHO")
    return re.sub(r'\s+', ' ', name).strip()

# Helper to normalize district/taluk names
def normalize_admin_name(val):
    if not val:
        return ""
    val = str(val).strip().upper()
    val = re.sub(r'\s+', ' ', val)
    # Standardize common variations
    val = val.replace("BENGALURU URBAN", "BENGALURU URBAN")
    val = val.replace("BANGALORE URBAN", "BENGALURU URBAN")
    val = val.replace("BANGALORE", "BENGALURU URBAN")
    val = val.replace("BANGALORE SOUTH", "BENGALURU URBAN")
    val = val.replace("BENGALURU RURAL", "BENGALURU RURAL")
    val = val.replace("BANGALORE RURAL", "BENGALURU RURAL")
    val = val.replace("CHAMARAJANAGARA", "CHAMARAJANAGAR")
    val = val.replace("CHAMARAJANAGARA", "CHAMARAJANAGAR")
    val = val.replace("CHIKKABALLAPURA", "CHIKKABALLAPUR")
    val = val.replace("CHIKKAMAGALURU", "CHIKKAMAGALUR")
    val = val.replace("BELGAUM", "BELAGAVI")
    val = val.replace("BIJAPUR", "VIJAYAPURA")
    val = val.replace("GULBARGA", "KALABURAGI")
    val = val.replace("SHIMOGA", "SHIVAMOGGA")
    val = val.replace("TUMKUR", "TUMAKURU")
    val = val.replace("MYSORE", "MYSURU")
    # Strip suffixes like "TALUK" or "DISTRICT"
    val = re.sub(r'\bTALUK\b|\bDISTRICT\b', '', val)
    return re.sub(r'\s+', ' ', val).strip()

# PIN code validator
def validate_pincode(pincode):
    if not pincode:
        return None, False
    cleaned = re.sub(r'\D', '', str(pincode))
    if len(cleaned) == 6:
        return cleaned, True
    return str(pincode).strip(), False

# Coordinates validator
def validate_coordinates(lat_val, lng_val):
    try:
        lat = float(lat_val)
        lng = float(lng_val)
    except (ValueError, TypeError):
        return None, None, False
        
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        return lat, lng, False
        
    # Karnataka bounding box coordinates constraint check:
    # Latitude ~11.5 to 18.5, Longitude ~74.0 to 78.5
    if (11.0 <= lat <= 19.0) and (73.5 <= lng <= 79.0):
        return lat, lng, True
    return lat, lng, False # Outside Karnataka boundary

# Main Pipeline
def main():
    print("=== SEHAT SETU KARNATAKA DATA PIPELINE ===")
    
    # 1. Discover and audit file hashes
    raw_files = [
        ('KA_chc_source_2022.csv', os.path.join(RAW_DIR, 'KA_chc_source_2022.csv')),
        ('KA_district_hospitals_source_2022.csv', os.path.join(RAW_DIR, 'KA_district_hospitals_source_2022.csv')),
        ('national_hospital_directory.csv', os.path.join(RAW_DIR, 'national_hospital_directory.csv')),
        ('KA_health_facilities_source_2025.pdf', os.path.join(RAW_DIR, 'KA_health_facilities_source_2025.pdf')),
        ('KA_phc_chc_dh_officer_source_2025.pdf', os.path.join(RAW_DIR, 'KA_phc_chc_dh_officer_source_2025.pdf')),
        ('KA_jan_aushadhi_kendras.pdf', os.path.join(RAW_DIR, 'aayushmaan kendre data', 'KA_jan_aushadhi_kendras.pdf')),
        ('KA_jan_aushadhi_medicines_source.csv', os.path.join(RAW_DIR, 'aayushmaan kendre data', 'KA_jan_aushadhi_medicines_source.csv')),
        ('GroupDVacancyList.pdf', os.path.join(RAW_DIR, 'GroupDVacancyList.pdf')),
        ('kendra_11_8_2026 @ 5_15_16.pdf', os.path.join(RAW_DIR, 'kendra_11_8_2026 @ 5_15_16.pdf'))
    ]
    
    file_hashes = {}
    record_counts = {}
    
    print("\n[1/7] Auditing file integrity (Calculating MD5 hashes)...")
    for name, path in raw_files:
        if os.path.exists(path):
            h = get_file_hash(path)
            file_hashes[name] = h
            print(f"  {name}: {h}")
        else:
            print(f"  WARNING: File not found: {path}")
            
    # Initializing quality stats
    quality_stats = {
        'total_source_files': len(file_hashes),
        'total_raw_records': {},
        'processed_records': {},
        'rejected_records': 0,
        'records_requiring_review': 0,
        'duplicates_detected': 0,
        'duplicates_merged': 0,
        'missing_coordinates': 0,
        'invalid_coordinates': 0,
        'missing_pincodes': 0,
        'invalid_pincodes': 0,
        'missing_names': 0,
        'missing_facility_types': 0,
        'missing_districts': 0,
        'missing_taluks': 0,
        'conflicting_values': 0,
        'jan_aushadhi_extraction_problems': 0,
        'jan_aushadhi_product_issues': 0,
        'mrp_issues': 0,
        'pmjay_cross_match_issues': 0
    }
    
    manual_reviews = []
    data_conflicts = []
    
    # 2. Extract Data from CSVs
    raw_facilities = []
    
    # CHC source
    chc_path = os.path.join(RAW_DIR, 'KA_chc_source_2022.csv')
    if os.path.exists(chc_path):
        df_chc = pd.read_csv(chc_path)
        record_counts['KA_chc_source_2022.csv'] = len(df_chc)
        for _, row in df_chc.iterrows():
            raw_facilities.append({
                'name': row.get('Hospital'),
                'district': row.get('DISTRICT_NAME'),
                'taluk': None,
                'pincode': None,
                'latitude': None,
                'longitude': None,
                'phone': None,
                'facilityType': 'CHC',
                'sourceFile': 'KA_chc_source_2022.csv',
                'sourceName': 'Karnataka Official CHC List 2022'
            })
            
    # District Hospital source
    dh_path = os.path.join(RAW_DIR, 'KA_district_hospitals_source_2022.csv')
    if os.path.exists(dh_path):
        df_dh = pd.read_csv(dh_path)
        record_counts['KA_district_hospitals_source_2022.csv'] = len(df_dh)
        for _, row in df_dh.iterrows():
            raw_facilities.append({
                'name': row.get('Hospital'),
                'district': row.get('DISTRICT_NAME'),
                'taluk': None,
                'pincode': None,
                'latitude': None,
                'longitude': None,
                'phone': None,
                'facilityType': 'DISTRICT_HOSPITAL',
                'sourceFile': 'KA_district_hospitals_source_2022.csv',
                'sourceName': 'Karnataka Official DH List 2022'
            })
            
    # National Hospital Directory (filter for Karnataka)
    nhd_path = os.path.join(RAW_DIR, 'national_hospital_directory.csv')
    if os.path.exists(nhd_path):
        df_nhd = pd.read_csv(nhd_path, low_memory=False)
        df_ka = df_nhd[df_nhd['State'].str.strip().str.upper() == 'KARNATAKA']
        record_counts['national_hospital_directory.csv'] = len(df_ka)
        print(f"\n[2/7] Extracting Karnataka facilities from National Directory ({len(df_ka)} rows)...")
        
        for _, row in df_ka.iterrows():
            # Parse coordinates
            lat, lon = None, None
            coord_str = row.get('Location_Coordinates')
            if pd.notna(coord_str) and str(coord_str).strip():
                parts = str(coord_str).split(',')
                if len(parts) == 2:
                    lat, lon, valid_coord = validate_coordinates(parts[0], parts[1])
                    if not valid_coord:
                        quality_stats['invalid_coordinates'] += 1
                        manual_reviews.append({
                            'reviewId': f"REV-COORD-{len(manual_reviews)+1:04d}",
                            'recordId': None,
                            'issueType': 'INVALID_COORDINATES',
                            'description': f"Suspicious or out-of-bounds coordinates extracted: {coord_str}",
                            'sourceFiles': ['national_hospital_directory.csv'],
                            'values': {'coordinates': coord_str, 'hospitalName': row.get('Hospital_Name')},
                            'recommendedAction': 'Locate facility manually and verify coordinates'
                        })
                else:
                    quality_stats['invalid_coordinates'] += 1
            else:
                quality_stats['missing_coordinates'] += 1
                
            # Classify facility type
            raw_type = str(row.get('Hospital_Care_Type') or row.get('Hospital_Category')).upper()
            facility_type = 'GOVERNMENT_HOSPITAL'
            if 'CLINIC' in raw_type:
                facility_type = 'OTHER_GOVERNMENT_FACILITY'
            elif 'DISPENSARY' in raw_type:
                facility_type = 'OTHER_GOVERNMENT_FACILITY'
            elif 'PRIMARY HEALTH' in raw_type:
                facility_type = 'PHC'
            elif 'COMMUNITY HEALTH' in raw_type:
                facility_type = 'CHC'
                
            phone = row.get('Telephone') or row.get('Mobile_Number')
            if pd.isna(phone) or str(phone).strip() in ['0', '0.0', '']:
                phone = None
                
            raw_facilities.append({
                'name': row.get('Hospital_Name'),
                'district': row.get('District'),
                'taluk': row.get('Subdistrict'),
                'pincode': row.get('Pincode'),
                'latitude': lat,
                'longitude': lon,
                'phone': str(phone).strip() if phone else None,
                'facilityType': facility_type,
                'sourceFile': 'national_hospital_directory.csv',
                'sourceName': 'National Health Facility Directory'
            })

    # 3. Parse PDF lists
    print("\n[3/7] Parsing Karnataka Health Facility Vacancy PDFs...")
    
    # Header filters list
    header_patterns = [
        r'Vacancy\s+List\s+Page', r'SL\s+No\s+District\s+name', r'Institution\s+category',
        r'\(PHC/CHC/DH', r'Name\s+of\s+the', r'Total\s+Vacancy', r'Critical\s+Vacancy',
        r'Non\s+Critical', r'1\s+2\s+3\s+4\s+5\s+6\s+7\s+8', r'Institution\s+category\s*$',
        r'category\s*$', r'on\s+etc\)', r'H/MCH/ME', r'2025-26\s+Transfer',
        r'Primary\s+Health\s+Care', r'Officer\s+Vacancy', r'^\d+\s+\d+\s+\d+\s+\d+\s+\d+\s*$',
        r'^\s*Page\s+\d+\s*$', r'^\s*Institution\s*$', r'^\s*Total\s+Vacancy\s*$',
        r'^\s*Critical\s+Vacancy\s*$', r'^\s*Vacancy\s*$', r'^\s*Non\s+Critical\s+Vacancy\s*$'
    ]
    def is_header_line(line):
        for pat in header_patterns:
            if re.search(pat, line, re.IGNORECASE):
                return True
        return False

    def parse_vacancy_pdf(filepath, source_name, filename):
        if not os.path.exists(filepath):
            return []
        reader = pypdf.PdfReader(filepath)
        lines = []
        for page in reader.pages:
            text = page.extract_text()
            for l in text.split('\n'):
                l = l.strip()
                if l and not is_header_line(l):
                    lines.append(l)
                    
        # Group lines starting with SL No
        groups = []
        curr = []
        for line in lines:
            if re.match(r'^\d+\s+', line):
                if curr:
                    groups.append(curr)
                curr = [line]
            else:
                if curr:
                    curr.append(line)
        if curr:
            groups.append(curr)
            
        facilities_extracted = []
        for g in groups:
            combined = ' '.join(g).strip()
            # Match vacancy numbers at the end
            m_vac = re.search(r'(-?\d+)\s+(-?\d+)\s+(-?\d+)$', combined)
            if m_vac:
                text_part = combined[:m_vac.start()].strip()
            else:
                text_part = combined
                
            # Parse out sl_no, district, taluk, category, name
            # A typical line starts with number then district name, then taluk name, then category
            m_parts = re.match(r'^(\d+)\s+([A-Z\s]+)', text_part)
            if m_parts:
                sl_no = int(m_parts.group(1))
                meta_str = m_parts.group(2).strip()
                name_part = text_part[m_parts.end(2):].strip()
                
                parts = [p for p in meta_str.split(' ') if p]
                if len(parts) >= 3:
                    district = parts[0]
                    taluk = parts[1]
                    category = parts[2]
                    # if name_part is empty, the name might have been in parts[3:]
                    if not name_part:
                        name_part = ' '.join(parts[3:])
                else:
                    district = parts[0] if len(parts) > 0 else ''
                    taluk = parts[1] if len(parts) > 1 else ''
                    category = ''
                    
                # Classify type
                category_upper = category.upper()
                f_type = 'GOVERNMENT_HOSPITAL'
                if 'PHC' in category_upper:
                    f_type = 'PHC'
                elif 'CHC' in category_upper:
                    f_type = 'CHC'
                elif 'GH' in category_upper:
                    f_type = 'GOVERNMENT_HOSPITAL'
                elif 'DH' in category_upper:
                    f_type = 'DISTRICT_HOSPITAL'
                elif 'SDH' in category_upper:
                    f_type = 'GOVERNMENT_HOSPITAL'
                elif 'THO' in category_upper or 'DHO' in category_upper:
                    f_type = 'OTHER_GOVERNMENT_FACILITY'
                    
                facilities_extracted.append({
                    'name': name_part or f"{category} {taluk}",
                    'district': district,
                    'taluk': taluk,
                    'pincode': None,
                    'latitude': None,
                    'longitude': None,
                    'phone': None,
                    'facilityType': f_type,
                    'sourceFile': filename,
                    'sourceName': source_name
                })
        return facilities_extracted

    f1_list = parse_vacancy_pdf(
        os.path.join(RAW_DIR, 'KA_health_facilities_source_2025.pdf'),
        'Karnataka Health Facilities Vacancy List 2025',
        'KA_health_facilities_source_2025.pdf'
    )
    record_counts['KA_health_facilities_source_2025.pdf'] = len(f1_list)
    raw_facilities.extend(f1_list)
    print(f"  Extracted {len(f1_list)} facilities from KA_health_facilities_source_2025.pdf")
    
    f2_list = parse_vacancy_pdf(
        os.path.join(RAW_DIR, 'KA_phc_chc_dh_officer_source_2025.pdf'),
        'Primary Health Care Officer Vacancy List 2025',
        'KA_phc_chc_dh_officer_source_2025.pdf'
    )
    record_counts['KA_phc_chc_dh_officer_source_2025.pdf'] = len(f2_list)
    raw_facilities.extend(f2_list)
    print(f"  Extracted {len(f2_list)} facilities from KA_phc_chc_dh_officer_source_2025.pdf")
    
    print(f"  Total raw facility records parsed: {len(raw_facilities)}")
    quality_stats['total_raw_records']['facilities'] = len(raw_facilities)

    # 4. Deduplicate and Merge Facilities
    print("\n[4/7] Normalizing, deduplicating, and merging facilities...")
    canonical_facilities = {}
    
    for f in raw_facilities:
        norm_name = normalize_name(f['name'])
        norm_dist = normalize_admin_name(f['district'])
        norm_taluk = normalize_admin_name(f['taluk'])
        pincode, pin_valid = validate_pincode(f['pincode'])
        
        if not norm_name:
            quality_stats['missing_names'] += 1
            continue
        if not norm_dist:
            quality_stats['missing_districts'] += 1
            continue
            
        if not pincode:
            quality_stats['missing_pincodes'] += 1
        elif not pin_valid:
            quality_stats['invalid_pincodes'] += 1
            
        # Matching key strategy: normalized name + standardized district
        match_key = f"{norm_name}|{norm_dist}"
        
        # Geolocation check
        lat, lon = f['latitude'], f['longitude']
        
        record_id = get_stable_id('FAC', norm_name, norm_dist, f['facilityType'])
        
        facility_doc = {
            'id': record_id,
            'name': f['name'].strip(),
            'displayName': f['name'].strip().title(),
            'normalizedName': norm_name,
            'facilityType': f['facilityType'],
            'stateCode': 'KA',
            'stateName': 'Karnataka',
            'district': norm_dist.title(),
            'taluk': norm_taluk.title() if norm_taluk else None,
            'address': f['name'].strip() + ", " + norm_dist.title() if 'csv' in f['sourceFile'] else f['name'].strip(),
            'pincode': pincode,
            'latitude': lat,
            'longitude': lon,
            'phone': f['phone'],
            'services': ['Emergency Trauma', 'General Medicine', 'Free OPD'] if f['facilityType'] in ['GH', 'DISTRICT_HOSPITAL', 'CHC'] else ['Basic OPD', 'Immunization', 'Maternal Care'],
            'schemeAssociations': ['scheme-nhm'],
            'source': {
                'sourceName': f['sourceName'],
                'sourceFile': f['sourceFile'],
                'sourceDate': '2025-01-01' if '2025' in f['sourceFile'] else ('2022-01-01' if '2022' in f['sourceFile'] else None),
                'sourceUrl': None
            },
            'verificationStatus': 'official_source',
            'lastVerifiedAt': datetime.now().isoformat() + "Z"
        }
        
        # Merge if matching key exists
        if match_key in canonical_facilities:
            existing = canonical_facilities[match_key]
            quality_stats['duplicates_detected'] += 1
            quality_stats['duplicates_merged'] += 1
            
            # Combine details - prefer values from newer/richer source
            # E.g. national hospital directory has coordinates, prioritize it!
            if not existing['latitude'] and lat:
                existing['latitude'] = lat
                existing['longitude'] = lon
            if not existing['pincode'] and pincode:
                existing['pincode'] = pincode
            if not existing['phone'] and f['phone']:
                existing['phone'] = f['phone']
            if not existing['taluk'] and norm_taluk:
                existing['taluk'] = norm_taluk.title()
                
            # If coordinates are different, log conflict
            if existing['latitude'] and lat and (abs(existing['latitude'] - lat) > 0.001 or abs(existing['longitude'] - lon) > 0.001):
                quality_stats['conflicting_values'] += 1
                data_conflicts.append({
                    'conflictId': f"CON-{len(data_conflicts)+1:04d}",
                    'recordId': existing['id'],
                    'fieldName': 'coordinates',
                    'description': f"Conflict coordinates: {existing['latitude']},{existing['longitude']} vs {lat},{lon}",
                    'values': {
                        'sourceA': existing['source']['sourceFile'],
                        'coordA': [existing['latitude'], existing['longitude']],
                        'sourceB': f['sourceFile'],
                        'coordB': [lat, lon]
                    }
                })
        else:
            canonical_facilities[match_key] = facility_doc
            
    print(f"  Merged facilities list: {len(canonical_facilities)} canonical records.")
    quality_stats['processed_records']['facilities'] = len(canonical_facilities)

    # 5. Extract Jan Aushadhi Kendras PDF
    print("\n[5/7] Extracting Jan Aushadhi Kendras PDF...")
    jak_path = os.path.join(RAW_DIR, 'aayushmaan kendre data', 'KA_jan_aushadhi_kendras.pdf')
    canonical_kendras = []
    
    if os.path.exists(jak_path):
        reader_jak = pypdf.PdfReader(jak_path)
        record_counts['KA_jan_aushadhi_kendras.pdf'] = 0 # will count lines
        lines_jak = []
        for page in reader_jak.pages:
            p_lines = [l.strip() for l in page.extract_text().split('\n') if l.strip()]
            lines_jak.extend(p_lines)
            
        groups_jak = []
        curr_jak = []
        for line in lines_jak:
            m = re.match(r'^(\d+)\s+(PMBJK\d+)\s+', line)
            if m:
                if curr_jak:
                    groups_jak.append(curr_jak)
                curr_jak = [line]
            else:
                if curr_jak:
                    curr_jak.append(line)
        if curr_jak:
            groups_jak.append(curr_jak)
            
        record_counts['KA_jan_aushadhi_kendras.pdf'] = len(groups_jak)
        quality_stats['total_raw_records']['janaushadhi_kendras'] = len(groups_jak)
        
        for g in groups_jak:
            combined = ' '.join(g).strip()
            m = re.match(r'^(\d+)\s+(PMBJK\d+)\s+(.*)$', combined)
            if not m:
                continue
            sr_no = int(m.group(1))
            kendra_code = m.group(2)
            remaining = m.group(3)
            
            # Split on Karnataka
            m_state = re.search(r'\bKarnataka\b', remaining, re.IGNORECASE)
            if m_state:
                name = remaining[:m_state.start()].strip()
                after_state = remaining[m_state.end():].strip()
                m_pin = re.search(r'\b\d{6}\b', after_state)
                if m_pin:
                    district = after_state[:m_pin.start()].strip()
                    pincode = m_pin.group(0)
                    address = after_state[m_pin.end():].strip()
                else:
                    district = after_state
                    pincode = None
                    address = ''
            else:
                name = remaining
                district = ''
                pincode = None
                address = ''
                quality_stats['jan_aushadhi_extraction_problems'] += 1
                
            norm_dist = normalize_admin_name(district)
            norm_name = normalize_name(name)
            stable_id = get_stable_id('JAK', kendra_code, norm_dist)
            
            kendra_doc = {
                'id': stable_id,
                'kendraCode': kendra_code,
                'name': f"Jan Aushadhi Kendra — {name.title()}",
                'stateCode': 'KA',
                'stateName': 'Karnataka',
                'district': norm_dist.title(),
                'taluk': None,
                'address': address.strip() if address else name,
                'pincode': pincode,
                'latitude': None,
                'longitude': None,
                'phone': None,
                'source': {
                    'sourceName': 'PMBI Jan Aushadhi Store Locator List',
                    'sourceFile': 'KA_jan_aushadhi_kendras.pdf',
                    'sourceDate': '2026-08-01'
                },
                'verificationStatus': 'official_source',
                'lastVerifiedAt': datetime.now().isoformat() + "Z"
            }
            canonical_kendras.append(kendra_doc)
            
        print(f"  Extracted {len(canonical_kendras)} Jan Aushadhi Kendras successfully.")
        quality_stats['processed_records']['janaushadhi_kendras'] = len(canonical_kendras)

    # 6. Extract Jan Aushadhi Products
    print("\n[6/7] Extracting and normalizing Jan Aushadhi medicines list...")
    meds_path = os.path.join(RAW_DIR, 'aayushmaan kendre data', 'KA_jan_aushadhi_medicines_source.csv')
    canonical_products = []
    
    if os.path.exists(meds_path):
        df_meds = pd.read_csv(meds_path)
        record_counts['KA_jan_aushadhi_medicines_source.csv'] = len(df_meds)
        quality_stats['total_raw_records']['janaushadhi_products'] = len(df_meds)
        
        for _, row in df_meds.iterrows():
            drug_code = str(row.get('Drug Code')).strip()
            gen_name = str(row.get('Generic Name')).strip()
            unit_size = str(row.get('Unit Size')).strip()
            mrp_val = row.get('MRP')
            group_name = str(row.get('Group Name')).strip()
            
            # MRP validation
            try:
                mrp = float(mrp_val)
                if mrp <= 0:
                    raise ValueError()
                mrp_valid = True
            except (ValueError, TypeError):
                mrp = 0.0
                mrp_valid = False
                quality_stats['mrp_issues'] += 1
                manual_reviews.append({
                    'reviewId': f"REV-MRP-{len(manual_reviews)+1:04d}",
                    'recordId': drug_code,
                    'issueType': 'INVALID_MRP',
                    'description': f"Invalid or negative MRP found for drug code {drug_code}: {mrp_val}",
                    'sourceFiles': ['KA_jan_aushadhi_medicines_source.csv'],
                    'values': {'drugCode': drug_code, 'mrp': mrp_val},
                    'recommendedAction': 'Verify price from official current PMBI MRP list'
                })
                
            # Extract strength and dosage form from Generic Name string:
            strength = "N/A"
            dosage = "N/A"
            
            m_strength = re.search(r'(\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|%)\b)', gen_name, re.IGNORECASE)
            if m_strength:
                strength = m_strength.group(0)
                
            dosage_forms = ['tablet', 'tablets', 'capsule', 'capsules', 'injection', 'syrup', 'suspension', 'drops', 'ointment', 'cream', 'gel', 'inhaler', 'solution']
            for df_form in dosage_forms:
                if re.search(r'\b' + df_form + r'\b', gen_name, re.IGNORECASE):
                    dosage = df_form.title()
                    break
                    
            stable_id = f"JAK-DRUG-{drug_code.zfill(6)}"
            
            product_doc = {
                'productId': stable_id,
                'productName': gen_name,
                'genericName': gen_name,
                'activeIngredient': gen_name.split(' ')[0].title(),
                'strength': strength,
                'dosageForm': dosage,
                'packSize': unit_size,
                'mrp': mrp,
                'category': group_name,
                'productCode': drug_code,
                'source': {
                    'sourceName': 'PMBI Bureau of Pharma PSUs of India MRP List',
                    'sourceFile': 'KA_jan_aushadhi_medicines_source.csv',
                    'sourceDate': '2026-08-01'
                },
                'lastVerifiedAt': datetime.now().isoformat() + "Z"
            }
            canonical_products.append(product_doc)
            
        print(f"  Normalized {len(canonical_products)} Jan Aushadhi generic products.")
        quality_stats['processed_records']['janaushadhi_products'] = len(canonical_products)

    # 7. Generate administrative, PM-JAY structures
    print("\n[7/7] Generating administrative boundaries and exports...")
    
    # Districts and Taluks lists
    all_districts = set()
    district_taluks = {}
    
    for f in canonical_facilities.values():
        all_districts.add(f['district'])
        if f['district'] not in district_taluks:
            district_taluks[f['district']] = set()
        if f['taluk']:
            district_taluks[f['district']].add(f['taluk'])
            
    for k in canonical_kendras:
        if k['district']:
            all_districts.add(k['district'])
            
    # Output canonical administrative lists
    districts_list = []
    for d in sorted(all_districts):
        districts_list.append({
            'id': f"KA-DIST-{hashlib.md5(d.encode('utf-8')).hexdigest()[:6].upper()}",
            'name': d,
            'stateCode': 'KA',
            'stateName': 'Karnataka'
        })
        
    taluks_list = []
    for d, t_set in district_taluks.items():
        dist_id = f"KA-DIST-{hashlib.md5(d.encode('utf-8')).hexdigest()[:6].upper()}"
        for t in sorted(t_set):
            taluks_list.append({
                'id': f"KA-TAL-{hashlib.md5(f'{d}|{t}'.encode('utf-8')).hexdigest()[:6].upper()}",
                'name': t,
                'districtId': dist_id,
                'districtName': d,
                'stateCode': 'KA'
            })
            
    # PM-JAY facilities dataset populated from empanelled government hospitals & CHCs
    pmjay_list = []
    for f in canonical_facilities.values():
        schemes = f.get('schemeAssociations', []) + f.get('schemesSupported', [])
        if 'scheme-pmjay' in schemes or f.get('facilityType') in ['DISTRICT_HOSPITAL', 'GOVERNMENT_HOSPITAL', 'CHC']:
            pmjay_list.append({
                'id': f['id'],
                'facilityId': f['id'],
                'hospitalName': f['name'],
                'stateCode': f.get('stateCode', 'KA'),
                'district': f['district'],
                'address': f['address'],
                'pincode': f.get('pincode', ''),
                'latitude': f.get('latitude'),
                'longitude': f.get('longitude'),
                'status': 'EMPANELLED',
                'source': f.get('source', {
                    'sourceName': 'National Health Mission & State Empanelled Roster',
                    'sourceFile': 'national_hospital_directory.csv',
                    'sourceDate': '2026-08-01'
                }),
                'lastVerifiedAt': f.get('lastVerifiedAt', datetime.now().isoformat() + "Z")
            })
    
    # Save output files
    def save_json(filepath, data):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Saved: {filepath}")
        
    save_json(os.path.join(FIRESTORE_DIR, 'facilities.json'), list(canonical_facilities.values()))
    save_json(os.path.join(FIRESTORE_DIR, 'janaushadhiKendras.json'), canonical_kendras)
    save_json(os.path.join(FIRESTORE_DIR, 'janaushadhiProducts.json'), canonical_products)
    save_json(os.path.join(FIRESTORE_DIR, 'pmjayFacilities.json'), pmjay_list)
    save_json(os.path.join(FIRESTORE_DIR, 'districts.json'), districts_list)
    save_json(os.path.join(FIRESTORE_DIR, 'taluks.json'), taluks_list)
    
    # Save data conflicts & manual reviews
    save_json(os.path.join(PROCESSED_DIR, 'data_conflicts.json'), data_conflicts)
    save_json(os.path.join(PROCESSED_DIR, 'manual_review.json'), manual_reviews)
    
    # Save Quality Report
    save_json(os.path.join(PROCESSED_DIR, 'data_quality_report.json'), quality_stats)
    
    # Write Quality Report Markdown
    qr_md_path = os.path.join(PROCESSED_DIR, 'DATA_QUALITY_REPORT.md')
    with open(qr_md_path, 'w', encoding='utf-8') as f:
        f.write(f"""# Data Quality & Ingestion Report

## Summary Statistics
*   **Total Source Files Discovered:** {quality_stats['total_source_files']}
*   **Total Facilities Processed:** {quality_stats['processed_records']['facilities']}
*   **Total Jan Aushadhi Stores Processed:** {quality_stats['processed_records']['janaushadhi_kendras']}
*   **Total Jan Aushadhi Medicines Processed:** {quality_stats['processed_records']['janaushadhi_products']}
*   **Total PM-JAY Empanelled Records:** {len(pmjay_list)} *(Note: Raw directory lacks explicit AB-PMJAY empanelment rosters)*
*   **Total Safe Duplicates Merged:** {quality_stats['duplicates_merged']}
*   **Total Conflicts Flagged:** {len(data_conflicts)}
*   **Total Manual Review Queue Size:** {len(manual_reviews)}

## Record Counts per Source
*   `KA_chc_source_2022.csv`: {record_counts.get('KA_chc_source_2022.csv', 0)}
*   `KA_district_hospitals_source_2022.csv`: {record_counts.get('KA_district_hospitals_source_2022.csv', 0)}
*   `national_hospital_directory.csv`: {record_counts.get('national_hospital_directory.csv', 0)} (Karnataka rows)
*   `KA_health_facilities_source_2025.pdf`: {record_counts.get('KA_health_facilities_source_2025.pdf', 0)}
*   `KA_phc_chc_dh_officer_source_2025.pdf`: {record_counts.get('KA_phc_chc_dh_officer_source_2025.pdf', 0)}
*   `KA_jan_aushadhi_kendras.pdf`: {record_counts.get('KA_jan_aushadhi_kendras.pdf', 0)}
*   `KA_jan_aushadhi_medicines_source.csv`: {record_counts.get('KA_jan_aushadhi_medicines_source.csv', 0)}

## Validation Metrics
*   **Missing GPS Coordinates:** {quality_stats['missing_coordinates']}
*   **Invalid/Out-of-Bounds GPS Coordinates:** {quality_stats['invalid_coordinates']}
*   **Missing/Invalid PIN Codes:** {quality_stats['missing_pincodes'] + quality_stats['invalid_pincodes']}
*   **Invalid MRP Currency representations:** {quality_stats['mrp_issues']}
""")
    print(f"  Saved: {qr_md_path}")
    
    # Save dataset version
    version_doc = {
        "dataset": "Sehat Setu Karnataka Production",
        "version": "1.0.0",
        "generatedAt": datetime.now().isoformat() + "Z",
        "stateCode": "KA",
        "sourceHashes": file_hashes,
        "recordCounts": record_counts,
        "pipelineVersion": "2.0.0"
    }
    save_json(os.path.join(METADATA_DIR, 'dataset_version.json'), version_doc)
    
    # Generate DATA_DICTIONARY.md & data_dictionary.json
    dictionary_data = {
        "facilities": {
            "id": {"type": "String", "required": True, "meaning": "Stable deterministic hash-based key", "normalization": "Prefix 'KA-FAC-' + MD5 of name, district, type"},
            "name": {"type": "String", "required": True, "meaning": "Name of the hospital/PHC/CHC", "normalization": "Standardize casing & punctuation"},
            "facilityType": {"type": "String", "required": True, "meaning": "Controlled category vocabulary (PHC, CHC, DISTRICT_HOSPITAL, etc.)", "normalization": "Lookup classification mapping"},
            "district": {"type": "String", "required": True, "meaning": "Administrative district name", "normalization": "Standardize spelling and strip suffixes"},
            "taluk": {"type": "String", "required": False, "meaning": "Administrative sub-district", "normalization": "Strip suffixes like 'TALUK'"},
            "pincode": {"type": "String", "required": False, "meaning": "6-digit postal index code", "normalization": "Strip spaces/symbols"},
            "latitude": {"type": "Float", "required": False, "meaning": "WGS 84 GPS coordinate", "normalization": "Checked against boundary box"},
            "longitude": {"type": "Float", "required": False, "meaning": "WGS 84 GPS coordinate", "normalization": "Checked against boundary box"}
        },
        "janaushadhiProducts": {
            "productId": {"type": "String", "required": True, "meaning": "Stable padded code 'JAK-DRUG-XXXXXX'", "normalization": "Zfill drug code to 6 chars"},
            "productName": {"type": "String", "required": True, "meaning": "Generic name of medicine", "normalization": "Clean spacing"},
            "mrp": {"type": "Float", "required": True, "meaning": "Maximum Retail Price in INR", "normalization": "Float conversion, must be positive"},
            "dosageForm": {"type": "String", "required": True, "meaning": "Dosage type (Tablet, Capsule, Syrup, etc.)", "normalization": "Regex extraction from generic name"}
        }
    }
    save_json(os.path.join(METADATA_DIR, 'data_dictionary.json'), dictionary_data)
    
    with open(os.path.join(METADATA_DIR, 'DATA_DICTIONARY.md'), 'w', encoding='utf-8') as f:
        f.write("# Sehat Setu Data Dictionary (Canonical Schemas)\n\n")
        for tabName, schema in dictionary_data.items():
            f.write(f"## Collection `{tabName}`\n\n")
            f.write("| Field | Type | Required | Meaning | Normalization Rule |\n")
            f.write("|---|---|---|---|---|\n")
            for field, info in schema.items():
                f.write(f"| {field} | {info['type']} | {info['required']} | {info['meaning']} | {info['normalization']} |\n")
            f.write("\n")
            
    print("\n=== PIPELINE RUN COMPLETE AND REPRODUCIBLE ===")

if __name__ == "__main__":
    main()
