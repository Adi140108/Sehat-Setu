# Sehat Setu Data Dictionary (Canonical Schemas)

## Collection `facilities`

| Field | Type | Required | Meaning | Normalization Rule |
|---|---|---|---|---|
| id | String | True | Stable deterministic hash-based key | Prefix 'KA-FAC-' + MD5 of name, district, type |
| name | String | True | Name of the hospital/PHC/CHC | Standardize casing & punctuation |
| facilityType | String | True | Controlled category vocabulary (PHC, CHC, DISTRICT_HOSPITAL, etc.) | Lookup classification mapping |
| district | String | True | Administrative district name | Standardize spelling and strip suffixes |
| taluk | String | False | Administrative sub-district | Strip suffixes like 'TALUK' |
| pincode | String | False | 6-digit postal index code | Strip spaces/symbols |
| latitude | Float | False | WGS 84 GPS coordinate | Checked against boundary box |
| longitude | Float | False | WGS 84 GPS coordinate | Checked against boundary box |

## Collection `janaushadhiProducts`

| Field | Type | Required | Meaning | Normalization Rule |
|---|---|---|---|---|
| productId | String | True | Stable padded code 'JAK-DRUG-XXXXXX' | Zfill drug code to 6 chars |
| productName | String | True | Generic name of medicine | Clean spacing |
| mrp | Float | True | Maximum Retail Price in INR | Float conversion, must be positive |
| dosageForm | String | True | Dosage type (Tablet, Capsule, Syrup, etc.) | Regex extraction from generic name |

