#!/usr/bin/env node

/**
 * Fire Pad Hit Effect Script
 * 
 * Listens for pad hits (MIDI note-on messages) and triggers a visual effect:
 * - Red at 100 intensity on hit
 * - Gradually fades to 0 while changing color to yellow
 * 
 * Pad layout: 4 rows × 16 columns (64 pads total)
 */

const midi = require('@julusian/midi');

let midiIn = null;
let midiOut = null;

// Track active effects: padIndex -> { startTime }
const activeEffects = new Map();

// Effect configuration
const EFFECT_CONFIG = {
  hitColor: { r: 100, g: 0, b: 0 },      // Red on hit
  targetColor: { r: 100, g: 100, b: 0 },  // Yellow at end
  duration: 500,  // ms for full fade (fast)
  fps: 30          // update frequency
};

// Base note for pad 0 (Row 1, Section A, Col 1)
const BASE_NOTE = 0x36; // 54 decimal

// Pad note mapping from docs/analysis.md
const ROW_BASES = {
  1: { A: 0x36, B: 0x3A, C: 0x3E, D: 0x42 },
  2: { A: 0x46, B: 0x4A, C: 0x4E, D: 0x52 },
  3: { A: 0x56, B: 0x5A, C: 0x5E, D: 0x62 },
  4: { A: 0x66, B: 0x6A, C: 0x6E, D: 0x72 }
};

const SECTION_ORDER = ['A', 'B', 'C', 'D'];

// Build note -> { row, section, colInSection, padIndex }
const PAD_NOTES = {};

for (const [row, bases] of Object.entries(ROW_BASES)) {
  const rowNum = parseInt(row);
  
  for (let sectionIdx = 0; sectionIdx < SECTION_ORDER.length; sectionIdx++) {
    const section = SECTION_ORDER[sectionIdx];
    const baseNote = bases[section];
    
    for (let colInSection = 0; colInSection < 4; colInSection++) {
      const note = baseNote + colInSection;
      // Pad index: (row-1)*16 + sectionIdx*4 + colInSection
      const padIndex = (rowNum - 1) * 16 + sectionIdx * 4 + colInSection;
      
      PAD_NOTES[note] = {
        row: rowNum,
        section,
        colInSection: colInSection + 1,
        padIndex
      };
    }
  }
}

async function openMIDI() {
  // Open output for sending pad colors
  midiOut = new midi.output();
  
  const portCount = midiOut.getPortCount();
  let outPortIndex = -1;
  
  for (let i = 0; i < portCount; i++) {
    const name = midiOut.getPortName(i);
    if (name.includes('FIRE')) {
      outPortIndex = i;
    }
  }
  
  if (outPortIndex === -1) {
    throw new Error('Could not find FL STUDIO FIRE');
  }
  
  midiOut.openPort(outPortIndex);
  console.log(`Connected to: ${midiOut.getPortName(outPortIndex)}\n`);
  
  // Open input for receiving pad hits
  midiIn = new midi.input();
  
  let inPortIndex = -1;
  for (let i = 0; i < midiIn.getPortCount(); i++) {
    const name = midiIn.getPortName(i);
    if (name.includes('FIRE')) {
      inPortIndex = i;
    }
  }
  
  if (inPortIndex === -1) {
    throw new Error('Could not find FL STUDIO FIRE input');
  }
  
  midiIn.openPort(inPortIndex);
  console.log(`Input from: ${midiIn.getPortName(inPortIndex)}\n`);
  
  // Set up note-on message handler
  midiIn.on('message', handleMIDIMessage);
}

function handleMIDIMessage(deltaTime, message) {
  if (Array.isArray(message)) {
    if (message.length >= 3) {
      const status = message[0] & 0xF0;
      const note = message[1];
      const velocity = message[2];
      
      // Note On with velocity > 0 for known pad notes only
      if (status === 0x90 && velocity > 0 && PAD_NOTES[note]) {
        const info = PAD_NOTES[note];
        console.log(`\n>>> Pad hit: Row ${info.row}, Section ${info.section}, Col ${info.colInSection} (Note 0x${note.toString(16).toUpperCase()}, PadIdx ${info.padIndex}, Velocity ${velocity})`);
        triggerEffect(info.padIndex);
      }
    }
  }
}

function sendPadColor(padIndex, red, green, blue) {
  const r = Math.min(100, Math.max(0, red));
  const g = Math.min(100, Math.max(0, green));
  const b = Math.min(100, Math.max(0, blue));
  
  // Single pad SysEx format: F0 47 7F 43 65 00 04 padIndex red green blue F7
  const sysex = [
    0xF0, 0x47, 0x7F, 0x43, 0x65,
    0x00, 0x04,
    padIndex,
    r, g, b,
    0xF7
  ];
  
  midiOut.sendMessage(sysex);
}

function triggerEffect(padIndex) {
  activeEffects.set(padIndex, {
    startTime: Date.now()
  });
}

function interpolateColor(progress, startColor, endColor) {
  return {
    r: Math.round(startColor.r + (endColor.r - startColor.r) * progress),
    g: Math.round(startColor.g + (endColor.g - startColor.g) * progress),
    b: Math.round(startColor.b + (endColor.b - startColor.b) * progress)
  };
}

async function effectLoop() {
  const interval = 1000 / EFFECT_CONFIG.fps;
  
  while (true) {
    const now = Date.now();
    
    for (const [padIndex, effect] of activeEffects) {
      const elapsed = now - effect.startTime;
      
      if (elapsed >= EFFECT_CONFIG.duration) {
        sendPadColor(padIndex, 0, 0, 0);
        activeEffects.delete(padIndex);
        continue;
      }
      
      const progress = elapsed / EFFECT_CONFIG.duration;
      const color = interpolateColor(progress, EFFECT_CONFIG.hitColor, EFFECT_CONFIG.targetColor);
      const intensity = 100 * (1 - progress);
      
      const finalR = Math.round(color.r * intensity / 100);
      const finalG = Math.round(color.g * intensity / 100);
      const finalB = Math.round(color.b * intensity / 100);
      
      sendPadColor(padIndex, finalR, finalG, finalB);
    }
    
    await sleep(interval);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showStatus() {
  console.log(`${'='.repeat(60)}`);
  console.log(`FIRE PAD HIT EFFECT`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Effect: Red (100) -> Yellow -> Off`);
  console.log(`Duration: ${EFFECT_CONFIG.duration}ms (fast)`);
  console.log(`\nHit any pad to trigger the effect!\n`);
  console.log(`Pad index = (row-1)*16 + section*4 + col`);
  console.log(`\nNote ranges by row:`);
  console.log(`Row 1: A=0x36, B=0x3A, C=0x3E, D=0x42`);
  console.log(`Row 2: A=0x46, B=0x4A, C=0x4E, D=0x52`);
  console.log(`Row 3: A=0x56, B=0x5A, C=0x5E, D=0x62`);
  console.log(`Row 4: A=0x66, B=0x6A, C=0x6E, D=0x72`);
  console.log(`\nPress Ctrl+C to exit.\n`);
}

async function main() {
  try {
    await openMIDI();
    await showStatus();
    await effectLoop();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    if (midiIn) midiIn.closePort();
    if (midiOut) midiOut.closePort();
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n\nShutting down...`);
  
  for (const padIndex of activeEffects.keys()) {
    sendPadColor(padIndex, 0, 0, 0);
  }
  activeEffects.clear();
  
  if (midiIn) midiIn.closePort();
  if (midiOut) midiOut.closePort();
  
  console.log('Done.');
  process.exit(0);
});

main().catch(console.error);
