# 🔐 ZKTeco iClock Parser

A robust TypeScript/JavaScript parser for ZKTeco iClock protocol attendance data with perfect type safety and comprehensive error handling.

[![npm version](https://img.shields.io/npm/v/@palmcode/zkteco-iclock-parser.svg)](https://www.npmjs.com/package/@palmcode/zkteco-iclock-parser)
[![npm downloads](https://img.shields.io/npm/dm/@palmcode/zkteco-iclock-parser.svg)](https://www.npmjs.com/package/@palmcode/zkteco-iclock-parser)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)

## ✨ Features

- 🎯 **Perfect Type Safety** - Complete TypeScript definitions
- 🛡️ **Robust Error Handling** - Graceful parsing with warnings
- 🔍 **Comprehensive Support** - All verification types (Fingerprint, Face, Palm, Card, Password)
- 📊 **Device Info Parsing** - Parse device information from requests
- ⚡ **High Performance** - Optimized for real-time attendance processing
- 🌐 **Framework Agnostic** - Works with Node.js, Bun, Express, etc.

## 🚀 Quick Start

### Installation

```bash
npm install @palmcode/zkteco-iclock-parser
```

### Basic Usage

```javascript
const { ZKTecoiClockParser } = require('@palmcode/zkteco-iclock-parser');

// Parse attendance data from ZKTeco device
const attendanceData = '11\t2025-08-27 10:57:49\t0\t25\t0\t0\t0\t0\t0\t0';
const result = ZKTecoiClockParser.parseAttendanceLog(attendanceData);

if (result.success) {
  result.data.forEach(log => {
    console.log(`User ${log.userID} - ${log.timestamp}`);
    console.log(`Type: ${ZKTecoiClockParser.getVerifyTypeName(log.verifyType)}`);
    console.log(`Action: ${ZKTecoiClockParser.isCheckIn(log) ? 'Check In' : 'Check Out'}`);
  });
}
```

### TypeScript Usage

```typescript
import { ZKTecoiClockParser, AttendanceLog, VerifyType } from '@palmcode/zkteco-iclock-parser';

const result = ZKTecoiClockParser.parseAttendanceLog(data);

if (result.success && result.data) {
  result.data.forEach((log: AttendanceLog) => {
    if (log.verifyType === VerifyType.PALM) {
      console.log('Palm recognition used!');
    }
  });
}
```

## 📋 API Reference

### `parseAttendanceLog(data: string, options?: ParserOptions)`

Parse raw attendance data from ZKTeco device.

**Parameters:**
- `data` - Raw tab-separated attendance data
- `options` - Parser options (optional)

**Returns:** `ParseResult<AttendanceLog[]>`

### `parseDeviceInfo(queryParams: Record<string, string>)`

Parse device information from HTTP query parameters.

**Returns:** `ParseResult<DeviceInfo>`

### Utility Methods

- `isCheckIn(log: AttendanceLog): boolean`
- `isCheckOut(log: AttendanceLog): boolean` 
- `getVerifyTypeName(type: VerifyType): string`
- `formatAttendanceLog(log: AttendanceLog): string`

## 🔧 Server Integration Examples

### Bun Server

```javascript
import { ZKTecoiClockParser } from '@palmcode/zkteco-iclock-parser';

Bun.serve({
  port: 3010,
  async fetch(req) {
    if (req.url.includes('/iclock/cdata')) {
      const body = await req.text();
      const result = ZKTecoiClockParser.parseAttendanceLog(body);
      
      // Process attendance logs
      
      return new Response("OK");
    }
  }
});
```

### Express.js Server

```javascript
const express = require('express');
const { ZKTecoiClockParser } = require('@palmcode/zkteco-iclock-parser');

const app = express();
app.use(express.text());

app.post('/iclock/cdata', (req, res) => {
  const result = ZKTecoiClockParser.parseAttendanceLog(req.body);
  
  if (result.success) {
    // Process attendance data
    result.data.forEach(log => {
      console.log(ZKTecoiClockParser.formatAttendanceLog(log));
    });
  }
  
  res.send('OK');
});

app.listen(3010);
```

## 📊 Data Format

### Attendance Log Structure

| Field | Position | Description |
|-------|----------|-------------|
| UserID | 0 | Employee/User identifier |
| Timestamp | 1 | Date and time (YYYY-MM-DD HH:mm:ss) |
| InOutMode | 2 | 0=Check In, 1=Check Out, 2=Break Out, etc. |
| VerifyType | 3 | 1=Fingerprint, 15=Face, 25=Palm, etc. |
| WorkCode | 4 | 0=Normal, 1=Overtime, 2=Holiday, etc. |

## 🎯 Verification Types

- `FINGERPRINT (1)` - Fingerprint verification
- `PASSWORD (2)` - Password verification
- `CARD (3)` - Card/RFID verification
- `FACE (15)` - Face recognition
- `PALM (25)` - Palm recognition

## 🔄 In/Out Modes

- `CHECK_IN (0)` - Regular check-in
- `CHECK_OUT (1)` - Regular check-out
- `BREAK_OUT (2)` - Break time start
- `BREAK_IN (3)` - Break time end
- `OT_IN (4)` - Overtime start
- `OT_OUT (5)` - Overtime end

## 🛠️ Advanced Options

```typescript
const options = {
  strictMode: true,        // Fail on any parsing error
  includeRawData: true,   // Include raw line in result
  timestampFormat: 'auto' // Timestamp parsing mode
};

const result = ZKTecoiClockParser.parseAttendanceLog(data, options);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © Palm Code Software Development L.L.C
