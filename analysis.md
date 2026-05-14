# Akai Fire - Complete Protocol Analysis

## Device Information
- **Vendor ID**: `0x09E8` (AKAI)
- **Product ID**: `0x0043`
- **USB Class**: Audio Class 1.0 (MIDI Streaming)
- **Interface**: 1 (MIDI Streaming Interface)
- **Endpoint IN**: `0x81` (Device to Host, Interrupt transfer)
- **MIDI Port Name**: "FL STUDIO FIRE"

---

## Part 1: Button/MIDI Protocol

### Protocol: Standard MIDI-over-USB (UAUDIO)

The Akai Fire uses the **Universal Serial Bus Device Class Definition for Audio Devices** (USB Audio 1.0) with MIDI Streaming support. This is NOT a proprietary HID protocol.

### MIDI-USB Packet Format (4 bytes)
```
Byte 0: Cable Number (0x00 = Cable 1) | Code Index (lower 4 bits)
Byte 1: MIDI Status (0x90 = Note On, 0x80 = Note Off)
Byte 2: MIDI Data1 (Note Number)
Byte 3: MIDI Data2 (Velocity / 0 for Note Off)
```

### Identified Button Mappings

#### Top Navigation Buttons (5 buttons)

| Button | Note (Hex) | Note (Dec) | Note Name | Note On Event | Note Off Event |
|--------|------------|------------|-----------|---------------|----------------|
| PATTERN UP (↑) | `0x1F` | 31 | G1 | `00 90 1f 7f` | `00 80 1f 00` |
| PATTERN DOWN (↓) | `0x20` | 32 | G#1 | `00 90 20 7f` | `00 80 20 00` |
| BROWSER | `0x21` | 33 | A1 | `00 90 21 7f` | `00 80 21 00` |
| GRID LEFT (←) | `0x22` | 34 | A#1 | `00 90 22 7f` | `00 80 22 00` |
| GRID RIGHT (→) | `0x23` | 35 | B1 | `00 90 23 7f` | `00 80 23 00` |

#### Left Side Buttons (5 buttons)

| Button | Note (Hex) | Note (Dec) | Note Name | Note On Event | Note Off Event |
|--------|------------|------------|-----------|---------------|----------------|
| MODE | `0x1A` | 26 | D1 | `00 90 1a 7f` | `00 80 1a 00` |
| PAD ROW 1 MUTE | `0x24` | 36 | C2 | `00 90 24 7f` | `00 80 24 00` |
| PAD ROW 2 MUTE | `0x25` | 37 | C#2 | `00 90 25 7f` | `00 80 25 00` |
| PAD ROW 3 MUTE | `0x26` | 38 | D2 | `00 90 26 7f` | `00 80 26 00` |
| PAD ROW 4 MUTE | `0x27` | 39 | D#2 | `00 90 27 7f` | `00 80 27 00` |

#### Bottom Left Buttons (6 buttons)

| Button | Note (Hex) | Note (Dec) | Note Name | Note On Event | Note Off Event |
|--------|------------|------------|-----------|---------------|----------------|
| ACCENT | `0x2C` | 44 | G#2 | `00 90 2c 7f` | `00 80 2c 00` |
| SNAP | `0x2D` | 45 | A2 | `00 90 2d 7f` | `00 80 2d 00` |
| TAP | `0x2E` | 46 | A#2 | `00 90 2e 7f` | `00 80 2e 00` |
| OVERVIEW | `0x2F` | 47 | B2 | `00 90 2f 7f` | `00 80 2f 00` |
| SHIFT | `0x30` | 48 | C3 | `00 90 30 7f` | `00 80 30 00` |
| ALT | `0x31` | 49 | C#3 | `00 90 31 7f` | `00 80 31 00` |

#### Bottom Right Buttons (4 buttons)

| Button | Note (Hex) | Note (Dec) | Note Name | Note On Event | Note Off Event |
|--------|------------|------------|-----------|---------------|----------------|
| METRONOME | `0x32` | 50 | D3 | `00 90 32 7f` | `00 80 32 00` |
| WAIT / PLAY (▶) | `0x33` | 51 | D#3 | `00 90 33 7f` | `00 80 33 00` |
| COUNTDOWN / STOP (■) | `0x34` | 52 | E3 | `00 90 34 7f` | `00 80 34 00` |
| LOOP REC / RECORD (●) | `0x35` | 53 | F3 | `00 90 35 7f` | `00 80 35 00` |

### Event Details
- **Note On**: Status `0x90`, Note number, Velocity `0x7F` (127 = maximum velocity)
- **Note Off**: Status `0x80`, Note number, Velocity `0x00` (always 0 for release)
- **Channel**: All buttons use MIDI Channel 1 (0x00 in easymidi notation)

### Timestamps from Capture
All button presses occurred on `2026-04-28` (UTC):

| Time Relative (s) | Event | Note |
|-------------------|-------|------|
| +4.95s | Button 1 Press | 0x1A Note On |
| +5.11s | Button 1 Release | 0x1A Note Off |
| +7.69s | Button 1 Press | 0x1A Note On |
| +7.87s | Button 1 Release | 0x1A Note Off |
| +9.67s | Button 1 Press | 0x1A Note On |
| +9.84s | Button 1 Release | 0x1A Note Off |
| +11.39s | Button 1 Press | 0x1A Note On |
| +11.56s | Button 1 Release | 0x1A Note Off |
| +22.24s | Button 2 Press | 0x24 Note On |
| ... | ... | ... |
| (continues for buttons 3-5) | | |

---

## Part 1.5: Knob/Encoder Protocol (MIDI Continuous Controller)

### Overview
The Akai Fire has 5 rotary controls that send both **Continuous Controller (CC)** messages for rotation and **Note On/Off** messages for touch/click events.

### Knob Mappings

#### Mixer Knobs (4 knobs)

| Knob | CC # (Hex) | CC # (Dec) | Rotation Type | Touch Note (Hex) | Touch Note (Dec) | Touch Behavior |
|------|------------|------------|---------------|------------------|------------------|----------------|
| VOLUME (Channel) | `0x10` | 16 | Continuous (0-127) | `0x10` | 16 | Note On (127) on touch, Note Off (0) on release |
| PAN (Channel) | `0x11` | 17 | Continuous (0-127) | `0x11` | 17 | Note On (127) on touch, Note Off (0) on release |
| FILTER (Channel) | `0x12` | 18 | Continuous (0-127) | `0x12` | 18 | Note On (127) on touch, Note Off (0) on release |
| RESONANCE (Channel) | `0x13` | 19 | Continuous (0-127) | `0x13` | 19 | Note On (127) on touch, Note Off (0) on release |

#### Navigation Knob (1 knob)

| Knob | CC # (Hex) | CC # (Dec) | Rotation Type | Click Note (Hex) | Click Note (Dec) | Click Behavior |
|------|------------|------------|---------------|------------------|------------------|----------------|
| SELECT (Navigation) | `0x76` | 118 | Continuous (0-127) | `0x19` | 25 | Note On (127) on click, Note Off (0) on release |

### Knob Event Details
- **CC Messages**: Standard MIDI Control Change (`0xB0` + CC # + Value) on Channel 1
- **Touch Messages**: Note On/Off for mixer knobs (VOLUME/PAN/FILTER/RESONANCE) — touch the knob cap to activate
- **Click Messages**: Note On/Off for SELECT knob — press the knob downward to click
- **Velocity Range**: Pads support velocity 32-127 (Fire has high threshold for velocity sensitivity)

### Pad Layout Protocol

#### Physical Layout
- **64 pads total**: 4 rows × 16 columns
- **Grouped into 4 sections**: A (Cols 1-4), B (Cols 5-8), C (Cols 9-12), D (Cols 13-16)
- **Each section**: 4 rows × 4 columns

#### Pad Note Mapping Pattern

| Row | Section A (Cols 1-4) | Section B (Cols 5-8) | Section C (Cols 9-12) | Section D (Cols 13-16) |
|-----|----------------------|----------------------|----------------------|----------------------|
| Row 1 | 0x36-0x39 (54-57) | 0x3A-0x3D (58-61) | 0x3E-0x41 (62-65) | 0x42-0x45 (66-69) |
| Row 2 | 0x46-0x49 (70-73) | 0x4A-0x4D (74-77) | 0x4E-0x51 (78-81) | 0x52-0x55 (82-85) |
| Row 3 | 0x56-0x59 (86-89) | 0x5A-0x5D (90-93) | 0x5E-0x61 (94-97) | 0x62-0x65 (98-101) |
| Row 4 | 0x66-0x69 (102-105) | 0x6A-0x6D (106-109) | 0x6E-0x71 (110-113) | 0x72-0x75 (114-117) |

#### Note Calculation Formula
```
Row 1 base notes: A=0x36, B=0x3A, C=0x3E, D=0x42
Row increment: +16 per row (0x10)
Column increment: +1 per column within section

Note = RowBase[section] + (Row-1) * 16 + (Col-SectionStart)
```

#### Complete Pad Note Reference Table

| Row | Section A | Section B | Section C | Section D |
|-----|-----------|-----------|-----------|-----------|
| **Row 1** | Col 1-4: `0x36`-`0x39` | Col 5-8: `0x3A`-`0x3D` | Col 9-12: `0x3E`-`0x41` | Col 13-16: `0x42`-`0x45` |
| **Row 2** | Col 1-4: `0x46`-`0x49` | Col 5-8: `0x4A`-`0x4D` | Col 9-12: `0x4E`-`0x51` | Col 13-16: `0x52`-`0x55` |
| **Row 3** | Col 1-4: `0x56`-`0x59` | Col 5-8: `0x5A`-`0x5D` | Col 9-12: `0x5E`-`0x61` | Col 13-16: `0x62`-`0x65` |
| **Row 4** | Col 1-4: `0x66`-`0x69` | Col 5-8: `0x6A`-`0x6D` | Col 9-12: `0x6E`-`0x71` | Col 13-16: `0x72`-`0x75` |

### Pad Event Details
- **Note On**: Status `0x90`, Note number, Velocity (32-127 range)
- **Note Off**: Status `0x80`, Note number, Velocity `0x00`
- **Channel**: All pads use MIDI Channel 1 (0x00 in easymidi notation)
- **Velocity**: Fire has high threshold — baseline is ~32, requires hard hit for 127

### Capture Data Files
| File | Content | Entries |
|------|---------|---------|
| `section-a-pads-capture.json` | Section A pads (Cols 1-4) | 16 entries |
| `section-b-pads-capture.json` | Section B pads (Cols 5-8) | 16 entries |
| `section-c-pads-capture.json` | Section C pads (Cols 9-12) | 16 entries |
| `section-d-pads-capture.json` | Section D pads (Cols 13-16) | 16 entries |
| `knobs-capture.json` | All 5 knobs (rotation + touch/click) | 5 entries |
| `buttons-capture.json` | All 20 function buttons | 20 entries |

---

## Part 2: OLED Display Protocol (128×64 pixels)

### Overview
The 128×64 OLED display is controlled via **MIDI System Exclusive (SysEx)** messages using the Akai manufacturer ID.

**Discovery Date**: 2026-04-28  
**Verification Status**: ✅ Bit-Mutate implementation verified against reference (1171/1171 bytes match)

### SysEx Message Structure

```
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────────┬──────┐
│ F0   │ 47   │ 7F   │ 43   │ 0E   │ hh   │ ll   │ 00   │ 07 00 7F │ ...  │
│ Start│ Akai │ All- │ Fire │ OLED │      │      │ Start│ End Band  │ Bitmap│
│ SysEx│ Mfg ID│Call  │ Prod │ Write│      │      │ Band │ (00-7F) │ Data │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────────┴──────┘
                                                     │
                                                     ▼
                                            ┌──────┬──────┐
                                            │ ...  │ F7   │
                                            │ More │ End  │
                                            │ Data │ SysEx│
                                            └──────┴──────┘
```

### Byte-by-Byte Breakdown

| Offset | Name | Value | Description |
|--------|------|-------|-------------|
| 0 | `sysex_start` | `0xF0` | System Exclusive Start |
| 1 | `manufacturer_id` | `0x47` | Akai Manufacturer ID |
| 2 | `device_id` | `0x7F` | All-Call Address (sends to all Fire devices) |
| 3 | `product_id` | `0x43` | Fire Device Identifier |
| 4 | `command` | `0x0E` | OLED Display Write Command |
| 5 | `length_hi` | `hh` | Bits 7-13 of payload length |
| 6 | `length_lo` | `ll` | Bits 0-6 of payload length |
| 7 | `start_band` | `0x00` | Starting 8-pixel band (0-7) |
| 8 | `end_band` | `0x07` | Ending 8-pixel band (0-7) |
| 9 | `start_col` | `0x00` | Starting column (0-127) |
| 10 | `end_col` | `0x7F` | Ending column (0-127) |
| 11+ | `bitmap_data` | `xx...` | Pixel bitmap data (1171 bytes for full display) |
| Last | `sysex_end` | `0xF7` | System Exclusive End |

### Payload Length Encoding

The payload length is encoded as a 14-bit value split across two bytes:

```javascript
payload_length = 4 + bitmap_data_length  // 4-byte sub-header + bitmap
length_hi = (payload_length >> 7) & 0x7F  // Bits 7-13
length_lo = payload_length & 0x7F         // Bits 0-6
```

**Full display example:**
- Bitmap data: 1171 bytes
- Payload: 4 + 1171 = 1175 bytes
- `length_hi = (1175 >> 7) & 0x7F = 9` (0x09)
- `length_lo = 1175 & 0x7F = 23` (0x17)
- Length bytes: `09 17`
- Total SysEx: 11 + 1175 + 1 = 1187 bytes

### Sub-Header (Region Selection)

The 4-byte sub-header at offsets 7-10 allows partial display updates:

| Byte | Field | Range | Description |
|------|-------|-------|-------------|
| 7 | `start_band` | 0x00-0x07 | First 8-pixel row band to update |
| 8 | `end_band` | 0x00-0x07 | Last 8-pixel row band to update |
| 9 | `start_col` | 0x00-0x7F | First column to update (0-127) |
| 10 | `end_col` | 0x00-0x7F | Last column to update (0-127) |

**Example: Full Display Update**
```
0x00 0x07 0x00 0x7F
│    │    │    └─ End column 127
│    │    └───── Start column 0
│    └────────── End band (band 7 = rows 56-63)
└─────────────── Start band (band 0 = rows 0-7)
```

**Example: Partial Update (Top Half)**
```
0x00 0x03 0x00 0x7F
│    │    │    └─ End column 127
│    │    └───── Start column 0
│    └────────── End band (band 3 = rows 24-31)
└─────────────── Start band (band 0 = rows 0-7)
```

### Bit-Mutate Pixel Mapping

#### Overview

The OLED display is divided into **8 bands of 8×128 pixels**. Each band is written in blocks where the bit position in the MIDI SysEx message has **no linear relationship** to the pixel position on display. This is called "Bit-Mutate" mapping.

#### The 8×7 Warped Block

The display uses a tiled pattern where each 8×7 pixel block maps to 7 MIDI bytes (56 bits). The lookup table `_aBitMutate[row][col]` gives the bit position for each pixel in the 8×7 tile:

```c
static const U8 _aBitMutate[8][7] = {
  { 13,  19,  25,  31,  37,  43,  49 },  // row group 0
  {  0,  20,  26,  32,  38,  44,  50 },  // row group 1
  {  1,   7,  27,  33,  39,  45,  51 },  // row group 2
  {  2,   8,  14,  34,  40,  46,  52 },  // row group 3
  {  3,   9,  15,  21,  41,  47,  53 },  // row group 4
  {  4,  10,  16,  22,  28,  48,  54 },  // row group 5
  {  5,  11,  17,  23,  29,  35,  55 },  // row group 6
  {  6,  12,  18,  24,  30,  36,  42 }   // row group 7
};
```

#### Visual Mapping Reference

```
MIDI Message bytes (msb always 0)          Display positions
 7    6    5    4    3    2    1    0      0    1    2    3    4    5    6
+----+----+----+----+----+----+----+----+  +----+----+----+----+----+----+----+
|  - |  6 |  5 |  4 |  3 |  2 |  1 |  0|   0  | 13 | 19 | 25 | 31 | 37 | 43 | 49 |
|  - | 13 | 12 | 11 | 10 |  9 |  8 |  7 |   1  |  0 | 20 | 26 | 32 | 38 | 44 | 50 |
|  - | 20 | 19 | 18 | 17 | 16 | 15 | 14 |   2  |  1 |  7 | 27 | 33 | 39 | 45 | 51 |
|  - | 27 | 26 | 25 | 24 | 23 | 22 | 21 |   3  |  2 |  8 | 14 | 34 | 40 | 46 | 52 |
|  - | 34 | 33 | 32 | 31 | 30 | 29 | 28 |   4  |  3 |  9 | 15 | 21 | 41 | 47 | 53 |
|  - | 41 | 40 | 39 | 38 | 37 | 36 | 35 |   5  |  4 | 10 | 16 | 22 | 28 | 48 | 54 |
|  - | 48 | 47 | 46 | 45 | 44 | 43 | 42 |   6  |  5 | 11 | 17 | 23 | 29 | 35 | 55 |
|  - | 55 | 54 | 53 | 52 | 51 | 50 | 49 |   7  |  6 | 12 | 18 | 24 | 30 | 36 | 42 |
+----+----+----+----+----+----+----+----+  +----+----+----+----+----+----+----+
```

#### Pixel Coordinate Transformation Algorithm

The reference C code from the documentation:

```c
static void _PlotPixel(unsigned X, unsigned Y, unsigned C) {
  unsigned RemapBit;
  if (X < 128 && Y < 64) {
    // Unwind 128x64 arrangement into a 1024x8 arrangement.
    X += 128 * (Y/8);
    Y %= 8;
    // Remap by tiling 8x7 block of translated pixels.
    RemapBit = _aBitMutate[Y][X % 7];
    if (C > 0) {
      _aTestBitmap2[4 + X/7*8 + RemapBit/7] |= 1u << (RemapBit % 7);
    } else {
      _aTestBitmap2[4 + X/7*8 + RemapBit/7] &= ~(1u << (RemapBit % 7));
    }
  }
}
```

#### JavaScript Implementation (Verified)

```javascript
const BIT_MUTATE = [
    [13, 19, 25, 31, 37, 43, 49],  // row group 0
    [ 0, 20, 26, 32, 38, 44, 50],  // row group 1
    [ 1,  7, 27, 33, 39, 45, 51],  // row group 2
    [ 2,  8, 14, 34, 40, 46, 52],  // row group 3
    [ 3,  9, 15, 21, 41, 47, 53],  // row group 4
    [ 4, 10, 16, 22, 28, 48, 54],  // row group 5
    [ 5, 11, 17, 23, 29, 35, 55],  // row group 6
    [ 6, 12, 18, 24, 30, 36, 42]   // row group 7
];

function setPixel(bitmap, col, row) {
    if (col < 0 || col >= 128 || row < 0 || row >= 64) return;
    
    // Step 1: Unwind 128x64 into 1024x8 arrangement
    var flatX = col + 128 * Math.floor(row / 8);
    var rowInGroup = row % 8;
    
    // Step 2: Get Bit-Mutate remapped bit position
    var colIn7Group = flatX % 7;  // CRITICAL: use flatX, not col
    var remapBit = BIT_MUTATE[rowInGroup][colIn7Group];
    
    // Step 3: Calculate bitmap byte offset and bit position
    var byteOffset = Math.floor(flatX / 7) * 8 + Math.floor(remapBit / 7);
    var bitPos = remapBit % 7;
    
    if (byteOffset < bitmap.length) {
        bitmap[byteOffset] |= (1 << bitPos);
    }
}
```

#### Critical Implementation Detail: BUG FOUND AND FIXED

The initial implementation used `col % 7` instead of `flatX % 7`:

```javascript
// BUGGY (causes 16 pixel mapping errors):
const colIn7Group = col % 7;

// CORRECT (verified against reference):
var flatX = col + 128 * Math.floor(row / 8);
const colIn7Group = flatX % 7;
```

This bug caused incorrect pixel positioning because the column index must be calculated in the **unwrapped 1024×8 coordinate space**, not the original 128×64 space.

### Bitmap Size Calculation

```
Display: 128 × 64 pixels
Layout: 1024 × 8 (flat arrangement after unwinding)

Each group of 7 pixels in flatX requires 8 bytes:
- floor(flatX / 7) gives the group number
- Each group contributes 8 bytes to the bitmap

Total bitmap size: ceil(1024 / 7) × 8 = 147 × 8 = 1176 bytes
Actual used: 1171 bytes (device firmware optimization)

For SysEx message construction:
bitmap_size = 1171 bytes
payload_size = 4 + 1171 = 1175 bytes
total_sysex = 11 (header) + 1175 (payload) + 1 (end) = 1187 bytes
```

### Example: Full Display Update (Checkerboard Pattern)

From `sysex/MIDI_FIRE_Sysex_CheckerBitmap.syx`:
```
F0 47 7F 43 0E 09 17 00 07 00 7F [bitmap data...] F7
```

Header breakdown:
- `F0` - SysEx start
- `47 7F 43` - Akai Fire device address
- `0E` - Write OLED command
- `09 17` - Payload length: 9×128 + 23 = 1175 bytes
- `00 07` - Row bands 0 through 7 (full height: 64 pixels)
- `00 7F` - Columns 0 through 127 (full width)
- Bitmap data follows...

### Verification Results

Created [`debug_bitmap_verify.js`](debug_bitmap_verify.js:1) to verify the implementation:

| Implementation | Matches | Mismatches | Status |
|----------------|---------|------------|--------|
| CORRECT (`flatX % 7`) | 1171/1171 | **0** | ✅ Verified |
| BUGGY (`col % 7`) | 1155/1171 | **16** | ❌ Corrupted |

The corrected Bit-Mutate implementation produces output **identical** to the reference AllWhite bitmap captured from the device.

---

## How to Communicate

### Sending SysEx (OLED Display)

Use the `midi` library:

```javascript
const midi = require('midi');

const output = new midi.Output();
output.openPort(PORT);  // PORT = 3 for Akai Fire

// Build bitmap
const bitmap = new Uint8Array(1171).fill(0);
setPixel(bitmap, x, y);  // Set pixel at (x, y)

// Build payload with sub-header
const payload = new Uint8Array(4 + bitmap.length);
payload[0] = 0x00; // Start Band
payload[1] = 0x07; // End Band
payload[2] = 0x00; // Start Col
payload[3] = 0x7F; // End Col
payload.set(bitmap, 4);

// Calculate length bytes
const payloadLength = payload.length;
const high = (payloadLength >> 7) & 0x7F;
const low = payloadLength & 0x7F;

// Build SysEx message
const sysex = [
    0xF0, 0x47, 0x7F, 0x43, 0x0E, // Header
    high, low,                    // Length
    ...payload,                   // Payload
    0xF7                          // End
];

output.sendMessage(sysex);
output.closePort();
```

### Listening (Device to Host)

```javascript
const midi = require('midi');

const input = new midi.Input();
input.ignoreTypes(false, false, false); // Capture SysEx too
input.openPort(PORT);

input.on('message', function(deltaTime, message) {
    if (message[0] === 0xF0) {
        // Start of SysEx message
    } else if (message[0] === 0xF7) {
        // End of SysEx message
    }
});
```

---

## Troubleshooting

### Display Not Updating

1. **Verify MIDI port**: Check `midi.Output().getPortCount()` and ensure port 3 exists
2. **Check SysEx framing**: Message must start with `0xF0` and end with `0xF7`
3. **Validate payload length**: Ensure `length_hi` and `length_lo` correctly encode payload size
4. **Sub-header range**: Verify `start_band <= end_band` and `start_col <= end_col`

### Incorrect Pixel Position

1. **Bit-Mutate mapping**: Use `flatX % 7`, NOT `col % 7`
2. **Flat X calculation**: `flatX = col + 128 * floor(row / 8)`
3. **7-bit MIDI bytes**: Each byte contributes 7 bits, not 8
4. **Column wrapping**: Columns wrap every 7 pixels in the flat arrangement

---

## Test Scripts

| Script | Purpose |
|--------|---------|
| [`button-monitor.js`](button-monitor.js:1) | Real-time terminal monitor for pads, buttons, knobs |
| [`capture-section-a-pads.js`](capture-section-a-pads.js:1) | Capture Section A pad MIDI data (16 pads) |
| [`capture-pads.js`](capture-pads.js:1) | Generic pad capture for sections B/C/D |
| [`capture-knobs.js`](capture-knobs.js:1) | Capture knob rotation, touch, and click events |
| [`capture-buttons.js`](capture-buttons.js:1) | Capture button press/release MIDI data |
| [`midi-capture-lib.js`](midi-capture-lib.js:1) | Shared MIDI capture utilities |
| [`debug_bitmap_verify.js`](debug_bitmap_verify.js:1) | Verify Bit-Mutate implementation against reference |
| [`test_text_render.js`](test_text_render.js:1) | Render text and send to display (verified working) |
| [`send_text.js`](send_text.js:1) | Text rendering with Bit-Mutate mapping |
| [`send_test_fire.js`](send_test_fire.js:1) | Full display text example |
| [`send_checker_bitmap.js`](send_checker_bitmap.js:1) | Checkerboard pattern test |

---

## SysEx Example Files (in sysex/ directory)

| File | Description |
|------|-------------|
| `MIDI_FIRE_Sysex_AllBlackBitmap.syx` | Clear display (all black) |
| `MIDI_FIRE_Sysex_AllWhiteBitmap.syx` | Full white display |
| `MIDI_FIRE_Sysex_CheckerBitmap.syx` | Checkerboard pattern test |
| `MIDI_FIRE_Sysex_StaticSEGGERLogo.syx` | Static logo display |
| `MIDI_FIRE_Sysex_DynamicSEGGERLogo.syx` | Animated logo |
| `MIDI_FIRE_Sysex_StaticSpectrum.syx` | Static spectrum analyzer display |
| `MIDI_FIRE_Sysex_DynamicSpectrum.syx` | Animated spectrum analyzer |
| `MIDI_FIRE_Sysex_DynamicSpectrumWithButtons.syx` | Spectrum with button interaction |
| `MIDI_FIRE_Sysex_AllPadsGreen.syx` | Set all pads to green |
| `MIDI_FIRE_Sysex_AllPadsRed.syx` | Set all pads to red |
| `MIDI_FIRE_Sysex_AllPadsBlue.syx` | Set all pads to blue |

---

## Running the Tests

```bash
npm install
node midi_test.js          # Monitor button presses
node debug_bitmap_verify.js # Verify Bit-Mutate implementation
node test_text_render.js   # Send text to OLED display
```

---

## Part 3: Button LED Protocol (CC Messages)

### Overview
Function buttons use **MIDI Control Change (CC)** messages to control their built-in LEDs. Each button has a dedicated CC number that controls the LED color and intensity.

### Intensity Range
- **Values**: 0-4 (some buttons support more)
- **Zero-based**: Value 0 = all LEDs off

### LED Color/Intensity Mapping by Button Group

#### Pattern Selector (CC 31-35)
| CC | Buttons | LED Type | Behavior |
|----|---------|----------|----------|
| 31 | Pattern Up | Position Indicator | Values 0-4 select between 4 LED positions |
| 32 | Pattern Down | Position Indicator | Values 0-4 select between 4 LED positions |
| 33 | Browser | Position Indicator | Values 0-4 select between 4 LED positions |
| 34 | Grid Left | Position Indicator | Values 0-4 select between 4 LED positions |
| 35 | Grid Right | Position Indicator | Values 0-4 select between 4 LED positions |

#### Mute Track (CC 36-39)
| CC | Button | LED Type | Value 1 | Value 2 | Value 3 | Value 4 |
|----|--------|----------|---------|---------|---------|---------|
| 36-39 | Mute Track 1-4 | Dual Red/Green | Red (dim) | Green (dim) | Red (bright) | Green (bright) |

#### Accent/Snap/Tap/Overview/Shift/Loop (CC 44-48, 53)
| CC | Button | LED Type | Value 1 | Value 2 | Value 3 | Value 4 |
|----|--------|----------|---------|---------|---------|---------|
| 44 | Accent | Dual Red/Yellow | Red (dim) | Yellow (dim) | Red (bright) | Yellow (bright) |
| 45 | Snap | Dual Red/Yellow | Red (dim) | Yellow (dim) | Red (bright) | Yellow (bright) |
| 46 | Tap | Dual Red/Yellow | Red (dim) | Yellow (dim) | Red (bright) | Yellow (bright) |
| 47 | Overview | Dual Red/Yellow | Red (dim) | Yellow (dim) | Red (bright) | Yellow (bright) |
| 48 | Shift | Dual Red/Yellow | Red (dim) | Yellow (dim) | Red (bright) | Yellow (bright) |
| 53 | Loop/Rec | Dual Red/Yellow | Red (dim) | Yellow (dim) | Red (bright) | Yellow (bright) |

#### Alt/Stop (CC 49, 52)
| CC | Button | LED Type | Value 1 | Value 2 |
|----|--------|----------|---------|---------|
| 49 | Alt | Yellow Only | Yellow (dim) | Yellow (bright) |
| 52 | Stop | Yellow Only | Yellow (dim) | Yellow (bright) |

#### Metronome/Play (CC 50-51)
| CC | Button | LED Type | Value 1 | Value 2 | Value 3 | Value 4 |
|----|--------|----------|---------|---------|---------|---------|
| 50 | Metronome | Tri-Color | Yellow (dim) | Green (dim) | Red (bright) | Green (bright) |
| 51 | Play | Tri-Color | Yellow (dim) | Green (dim) | Red (bright) | Green (bright) |

### LED Color Type Summary
| Color Type | Buttons | Colors Available |
|------------|---------|------------------|
| Position Indicator | Pattern selector (CC 31-35) | 4 positions (0-4) |
| Dual Red/Green | Mute buttons (CC 36-39) | Red, Green |
| Dual Red/Yellow | Accent/Snap/Tap/Overview/Shift/Loop | Red, Yellow |
| Tri-Color | Metronome/Play | Yellow, Green, Red |
| Yellow Only | Alt/Stop | Yellow |

### Key Discovery: 2 Brightness Levels
All button LEDs have **2 brightness levels** (dim/bright), controlled by the value:
- Values 1, 2 = Dim intensity
- Values 3, 4 = Bright intensity

The color is determined by whether the value is odd or even within each brightness group.

---

## Part 4: Pad LED Protocol (SysEx Messages)

### Overview
The 64 performance pads have RGB LEDs controlled via **MIDI System Exclusive (SysEx)** messages using the Akai manufacturer ID.

### Pad Layout
- **64 pads total**: 4 rows × 16 columns
- **Grouped into 4 sections**: A (Cols 1-4), B (Cols 5-8), C (Cols 9-12), D (Cols 13-16)
- **Each section**: 4 rows × 4 columns

### Pad Index Calculation
```javascript
// From note number:
const BASE_NOTE = 0x36; // 54 decimal (Row 1, Section A, Col 1)
const padIndex = note - BASE_NOTE;

// Or from physical position:
const padIndex = (row - 1) * 16 + sectionIdx * 4 + colInSection;
// where row = 1-4, sectionIdx = 0-3 (A-D), colInSection = 0-3
```

### Pad Note Mapping Reference
| Row | Section A (Cols 1-4) | Section B (Cols 5-8) | Section C (Cols 9-12) | Section D (Cols 13-16) |
|-----|----------------------|----------------------|----------------------|----------------------|
| Row 1 | 0x36-0x39 (54-57) | 0x3A-0x3D (58-61) | 0x3E-0x41 (62-65) | 0x42-0x45 (66-69) |
| Row 2 | 0x46-0x49 (70-73) | 0x4A-0x4D (74-77) | 0x4E-0x51 (78-81) | 0x52-0x55 (82-85) |
| Row 3 | 0x56-0x59 (86-89) | 0x5A-0x5D (90-93) | 0x5E-0x61 (94-97) | 0x62-0x65 (98-101) |
| Row 4 | 0x66-0x69 (102-105) | 0x6A-0x6D (106-109) | 0x6E-0x71 (110-113) | 0x72-0x75 (114-117) |

### Single Pad SysEx Format
```
F0 47 7F 43 65 00 04 padIndex red green blue F7
```

| Byte | Value | Description |
|------|-------|-------------|
| F0 | SysEx start | |
| 47 | Akai manufacturer ID | |
| 7F | All-call address | |
| 43 | Fire product ID | |
| 65 | Pad LED command | |
| 00 | Reserved | |
| 04 | Payload length (4 bytes follow) | |
| padIndex | 0-63 | Pad index (calculated from note - 0x36) |
| red | 0-100 | Red intensity (0-100, NOT 0-127) |
| green | 0-100 | Green intensity (0-100, NOT 0-127) |
| blue | 0-100 | Blue intensity (0-100, NOT 0-127) |
| F7 | SysEx end | |

### All Pads SysEx Format
```
F0 47 7F 43 65 02 00 [padData...] F7
```

Where `padData` is a sequence of: `padIndex red green blue` for each pad (64 × 4 = 256 bytes)

### Intensity Range Discovery
- **Pad LED intensity**: Values 0-100 (NOT the full MIDI range 0-127)
- **Value 0**: LED off
- **Value 100**: Maximum brightness
- **Continuous control**: Smooth brightness transitions from 0 to 100

### RGB Color Capabilities
- **Full RGB**: Each pad supports Red, Green, and Blue channels independently
- **Color mixing**: Combine RGB values to create any color
- **Example colors**:
  - Red: `R=100 G=0 B=0`
  - Green: `R=0 G=100 B=0`
  - Blue: `R=0 G=0 B=100`
  - Yellow: `R=100 G=100 B=0`
  - Pink: `R=100 G=0 B=100`
  - White: `R=100 G=100 B=100`

---

## Part 5: Pad Animations & Effects

### Animation Framework
Pad animations are created by rapidly updating pad colors in a loop. The typical approach:

```javascript
async function effectLoop() {
  const interval = 1000 / fps; // ms per frame
  
  while (true) {
    const now = Date.now();
    
    for (const [padIndex, effect] of activeEffects) {
      const elapsed = now - effect.startTime;
      const progress = elapsed / EFFECT_CONFIG.duration;
      
      // Calculate color based on progress
      const color = interpolateColor(progress, startColor, endColor);
      const intensity = maxIntensity * (1 - progress);
      
      sendPadColor(padIndex, color.r * intensity, color.g * intensity, color.b * intensity);
    }
    
    await sleep(interval);
  }
}
```

### Example: Hit Effect (Red to Yellow Fade)
When a pad is hit:
1. **Initial**: Red at 100 intensity (`R=100 G=0 B=0`)
2. **Transition**: Color interpolates to yellow (`R=100 G=100 B=0`)
3. **Fade**: Intensity decreases to 0 over 500ms
4. **End**: Pad turns off

```javascript
const EFFECT_CONFIG = {
  hitColor: { r: 100, g: 0, b: 0 },
  targetColor: { r: 100, g: 100, b: 0 },
  duration: 500, // ms
  fps: 30
};
```

### Example: Red Wave Animation
Red wave moving from right to left with gradient:
- Column 7 (right): Red
- Column 0 (left): White
- Wave position cycles through columns

### Example: Gradient Animation
Static gradient across columns:
- Right column: Red (`R=100 G=0 B=0`)
- Left column: White (`R=100 G=100 B=100`)
- Intermediate columns: Interpolated colors

---

## Part 6: Interactive Testing Tools

### Available Scripts

| Script | Purpose |
|--------|---------|
| [`cc-probe.js`](cc-probe.js:1) | Discovers CC values for button LEDs |
| [`led-probe.js`](led-probe.js:1) | Probes pad MIDI note mappings |
| [`led-control.js`](led-control.js:1) | Controls LEDs with shorthand syntax (`1r`, `2g`, etc.) |
| [`led-characterize.js`](led-characterize.js:1) | Automated LED characterization (outputs to `docs/led-characterization.json`) |
| [`led-test-interactive.js`](led-test-interactive.js:1) | Interactive LED testing tool with custom stdin prompt |
| [`set-all-blue.js`](set-all-blue.js:1) | Sets all 64 pads to blue (R=0 G=0 B=100) |
| [`set-all-pink.js`](set-all-pink.js:1) | Sets all 64 pads to pink (R=100 G=0 B=100) |
| [`test-pad-intensity.js`](test-pad-intensity.js:1) | Tests pad brightness levels (0-100 range) |
| [`pad-animation.js`](pad-animation.js:1) | Pad animation demo (waves, gradients, rainbow) |
| [`pad-hit-effect.js`](pad-hit-effect.js:1) | Pad hit effect (red to yellow fade on hit) |

### Output Files

| File | Content |
|------|---------|
| `docs/cc-probe-results.json` | CC value discovery results for all buttons |
| `docs/led-characterization.json` | LED properties from automated characterization |
| `docs/led-characterization-interactive.json` | Results from interactive testing |
| `docs/pad-intensity-results.json` | Pad intensity range findings (0-100) |

---

## Important: node-hid is NOT Compatible

The Akai Fire uses **USB Audio Class**, not HID. The `node-hid` library cannot
communicate with this device. Use the `midi` library instead (`midi_test.js`).

## Important: Pad Intensity Range

Pad LED intensity uses values **0-100**, NOT the full MIDI range 0-127. When sending SysEx messages for pad colors, clamp values to 0-100 range.
