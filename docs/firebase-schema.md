# Sehat Setu — Firebase & Firestore Data Schema

## Collections

### 1. `users/{userId}`
```json
{
  "uid": "string",
  "role": "citizen | volunteer | admin",
  "displayName": "string (optional)",
  "preferredLanguage": "hi | kn | ta | te | mr | en",
  "createdAt": "ISO8601 Timestamp",
  "lastActiveAt": "ISO8601 Timestamp"
}
```

### 2. `facilities/{facilityId}`
```json
{
  "name": "string",
  "type": "PMJAY_EMPANELLED | JAN_AUSHADHI | PRIMARY_HEALTH_CENTRE | COMMUNITY_HEALTH_CENTRE | GOVERNMENT_HOSPITAL",
  "address": "string",
  "district": "string",
  "state": "string",
  "pincode": "string",
  "latitude": "number",
  "longitude": "number",
  "phone": "string",
  "services": ["string"],
  "schemesSupported": ["scheme-pmjay", "scheme-nhm"],
  "emergencyAvailable": "boolean",
  "isVerified": "boolean",
  "dataSource": "string",
  "lastVerifiedDate": "YYYY-MM-DD"
}
```

### 3. `schemes/{schemeId}`
```json
{
  "name": "string",
  "shortName": "string",
  "description": "string",
  "coverageDetails": "string",
  "state": "National | StateName",
  "targetGroup": "string",
  "eligibilityRules": {
    "minAge": "number (optional)",
    "maxIncomeCategory": ["BPL", "EWS"],
    "rationCardTypes": ["PHH", "AAY"]
  },
  "documentsRequired": ["Aadhaar Card", "Ration Card"],
  "officialSource": "URL String"
}
```

### 4. `supportRequests/{requestId}`
```json
{
  "userId": "string",
  "userName": "string",
  "userPhone": "string",
  "language": "string",
  "location": "string",
  "needDescription": "string",
  "status": "PENDING | IN_PROGRESS | RESOLVED",
  "assignedToVolunteerName": "string",
  "createdAt": "ISO8601 Timestamp"
}
```
