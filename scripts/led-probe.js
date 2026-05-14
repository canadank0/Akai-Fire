#!/usr/bin/env node

/**
 * Akai Fire LED Protocol Probe
 * 
 * Iterates through MIDI Note numbers 0-127 on Channel 1 to identify
 * which physical buttons/pads light up and how velocity affects brightness.
 * 
 * Usage: node led-probe.js
 */

const easymidi = require('easymidi');
const readline = require('readline');

// Configuration
const OUTPUT_NAME = 'FL STUDIO FIRE';
const CHANNEL = 1; // MIDI Channel 1
const HIGH_VELOCITY = 127;
const LOW_VELOCITY = 32;
const DELAY_MS = 500; // Wait time between notes

// Create MIDI output
let midiOut = null;

// Readline interface for CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Known mappings from reverse engineering
const KNOWN_BUTTONS = {
  // Top Navigation (5)
  31: 'PATTERN UP (↑)',
  32: 'PATTERN DOWN (↓)',
  33: 'BROWSER',
  34: 'GRID LEFT (←)',
  35: 'GRID RIGHT (→)',
  // Left Side (5)
  26: 'MODE',
  36: 'PAD ROW 1 MUTE',
  37: 'PAD ROW 2 MUTE',
  38: 'PAD ROW 3 MUTE',
  39: 'PAD ROW 4 MUTE',
  // Bottom Left (6)
  44: 'ACCENT',
  45: 'SNAP',
  46: 'TAP',
  47: 'OVERVIEW',
  48: 'SHIFT',
  49: 'ALT',
  // Bottom Right (4)
  50: 'METRONOME',
  51: 'WAIT / PLAY (▶)',
  52: 'COUNTDOWN / STOP (■)',
  53: 'LOOP REC / RECORD (●)',
  // Pads (64) - Section A (Cols 1-4)
  54: 'PAD R1C1 (Section A)',
  55: 'PAD R1C2 (Section A)',
  56: 'PAD R1C3 (Section A)',
  57: 'PAD R1C4 (Section A)',
  70: 'PAD R2C1 (Section A)',
  71: 'PAD R2C2 (Section A)',
  72: 'PAD R2C3 (Section A)',
  73: 'PAD R2C4 (Section A)',
  86: 'PAD R3C1 (Section A)',
  87: 'PAD R3C2 (Section A)',
  88: 'PAD R3C3 (Section A)',
  89: 'PAD R3C4 (Section A)',
  102: 'PAD R4C1 (Section A)',
  103: 'PAD R4C2 (Section A)',
  104: 'PAD R4C3 (Section A)',
  105: 'PAD R4C4 (Section A)',
  // Pads - Section B (Cols 5-8)
  58: 'PAD R1C5 (Section B)',
  59: 'PAD R1C6 (Section B)',
  60: 'PAD R1C7 (Section B)',
  61: 'PAD R1C8 (Section B)',
  74: 'PAD R2C5 (Section B)',
  75: 'PAD R2C6 (Section B)',
  76: 'PAD R2C7 (Section B)',
  77: 'PAD R2C8 (Section B)',
  90: 'PAD R3C5 (Section B)',
  91: 'PAD R3C6 (Section B)',
  92: 'PAD R3C7 (Section B)',
  93: 'PAD R3C8 (Section B)',
  106: 'PAD R4C5 (Section B)',
  107: 'PAD R4C6 (Section B)',
  108: 'PAD R4C7 (Section B)',
  109: 'PAD R4C8 (Section B)',
  // Pads - Section C (Cols 9-12)
  62: 'PAD R1C9 (Section C)',
  63: 'PAD R1C10 (Section C)',
  64: 'PAD R1C11 (Section C)',
  65: 'PAD R1C12 (Section C)',
  78: 'PAD R2C9 (Section C)',
  79: 'PAD R2C10 (Section C)',
  80: 'PAD R2C11 (Section C)',
  81: 'PAD R2C12 (Section C)',
  94: 'PAD R3C9 (Section C)',
  95: 'PAD R3C10 (Section C)',
  96: 'PAD R3C11 (Section C)',
  97: 'PAD R3C12 (Section C)',
  110: 'PAD R4C9 (Section C)',
  111: 'PAD R4C10 (Section C)',
  112: 'PAD R4C11 (Section C)',
  113: 'PAD R4C12 (Section C)',
  // Pads - Section D (Cols 13-16)
  66: 'PAD R1C13 (Section D)',
  67: 'PAD R1C14 (Section D)',
  68: 'PAD R1C15 (Section D)',
  69: 'PAD R1C16 (Section D)',
  82: 'PAD R2C13 (Section D)',
  83: 'PAD R2C14 (Section D)',
  84: 'PAD R2C15 (Section D)',
  85: 'PAD R2C16 (Section D)',
  98: 'PAD R3C13 (Section D)',
  99: 'PAD R3C14 (Section D)',
  100: 'PAD R3C15 (Section D)',
  101: 'PAD R3C16 (Section D)',
  114: 'PAD R4C13 (Section D)',
  115: 'PAD R4C14 (Section D)',
  116: 'PAD R4C15 (Section D)',
  117: 'PAD R4C16 (Section D)',
};

/**
 * Turn off all LEDs by sending note-off for all 128 notes
 */
async function turnOffAllLEDs() {
  console.log('\nTurning off all LEDs...');
  if (!midiOut) {
    console.log('  Warning: MIDI output not available, skipping turn-off');
    return;
  }
  
  for (let note = 0; note <= 127; note++) {
    sendNoteOff(note);
  }
  await wait(300);
  console.log('  All LEDs should be off now.');
}

/**
 * Log probe status and get user input
 */
function askNext() {
  rl.question('\n[Press Enter to continue to next note, or "q" to quit]\n> ', (answer) => {
    if (answer.toLowerCase() === 'q') {
      finishProbe();
      return;
    }
    probeNextNote();
  });
}

/**
 * Send a note-on message
 */
function sendNoteOn(note, velocity) {
  if (!midiOut) return;
  
  midiOut.send('noteon', {
    note: note,
    velocity: velocity,
    channel: CHANNEL
  });
}

/**
 * Send a note-off message
 */
function sendNoteOff(note) {
  if (!midiOut) return;
  
  midiOut.send('noteoff', {
    note: note,
    channel: CHANNEL
  });
}

/**
 * Wait for specified milliseconds
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Probe a single note with high velocity, then low velocity
 * @param {number} note - MIDI note number to probe
 * @param {boolean} isRepeat - Whether this is a repeat of the test
 */
async function probeNote(note, isRepeat = false) {
  const noteName = getNoteName(note);
  const knownButton = KNOWN_BUTTONS[note];
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Note: ${note} (0x${note.toString(16).toUpperCase().padStart(2, '0')}) | ${noteName}`);
  if (knownButton) {
    console.log(`Known: ${knownButton}`);
  } else {
    console.log('Known: UNMAPPED');
  }
  if (isRepeat) {
    console.log('(REPEAT TEST)');
  }
  console.log(`${'='.repeat(60)}`);
  
  // Test HIGH velocity (127)
  console.log(`\n[1] Sending HIGH velocity (${HIGH_VELOCITY})...`);
  console.log('    → Observe which physical button/pad lights up and brightness level');
  sendNoteOn(note, HIGH_VELOCITY);
  await wait(DELAY_MS);
  
  // Turn off
  sendNoteOff(note);
  await wait(200);
  
  // Test LOW velocity (32)
  console.log(`\n[2] Sending LOW velocity (${LOW_VELOCITY})...`);
  console.log('    → Compare brightness to previous test');
  sendNoteOn(note, LOW_VELOCITY);
  await wait(DELAY_MS);
  
  // Turn off
  sendNoteOff(note);
  await wait(200);
  
  // Ask user for input
  console.log('\n--- User Input Required ---');
  console.log('Did any button/pad light up? (y/n/r)');
  console.log('  y = Yes, I saw something');
  console.log('  n = No, nothing lit up');
  console.log('  r = Repeat (re-send the test)');
  
  rl.question('\n> ', async (answer) => {
    const answerLower = answer.toLowerCase().trim();
    
    if (answerLower === 'q') {
      finishProbe();
      return;
    }
    
    if (answerLower === 'r') {
      // Repeat the test for the same note
      await probeNote(note, true);
      return;
    }
    
    if (answerLower === 'y') {
      const buttonName = await new Promise(resolve => {
        rl.question('Which physical button lit up? (name or number)\n> ', resolve);
      });
      
      const velocityEffect = await new Promise(resolve => {
        rl.question('Did velocity affect brightness? (high/low/same/unknown)\n> ', resolve);
      });
      
      console.log(`\n✓ Recorded: Note ${note} → ${buttonName.trim()} | Velocity effect: ${velocityEffect.trim()}`);
    } else if (answerLower === 'n') {
      console.log(`✗ No response for note ${note}`);
    } else {
      console.log('Invalid input. Please enter y, n, or r.');
      // Re-prompt for the same note
      await probeNote(note, isRepeat);
      return;
    }
    
    askNext();
  });
}

/**
 * Get musical note name from MIDI note number
 */
function getNoteName(note) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  const noteIndex = note % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Probe the next note in sequence
 */
let currentNote = 0;

function probeNextNote() {
  if (currentNote > 127) {
    finishProbe();
    return;
  }
  
  probeNote(currentNote).then(() => {
    currentNote++;
  });
}

/**
 * Finish the probe and save results
 */
function finishProbe() {
  console.log('\n\n=== LED Probe Complete ===');
  console.log('Thank you for completing the hardware mapping phase.');
  
  if (midiOut) {
    midiOut.close();
    midiOut = null;
  }
  
  rl.close();
  
  console.log('\nResults should be saved to docs/led-probe-results.json');
  process.exit(0);
}

/**
 * Initialize and start the probe
 */
async function init() {
  console.log('Akai Fire LED Protocol Probe');
  console.log('============================\n');
  console.log('This script will iterate through MIDI notes 0-127 on Channel 1.');
  console.log(`For each note, it sends two messages:`);
  console.log(`  - High velocity (${HIGH_VELOCITY}) - bright`);
  console.log(`  - Low velocity (${LOW_VELOCITY}) - dim`);
  console.log('\nPlease have your Akai Fire ready and observe which physical');
  console.log('buttons/pads light up for each note.\n');
  
  try {
    // Get available MIDI outputs (works synchronously, returns array)
    const ports = easymidi.getOutputs();
    console.log('Available MIDI outputs:');
    ports.forEach((name, index) => {
      console.log(`  [${index}] ${name}`);
    });
    
    // Find the Fire port
    let foundPort = null;
    for (let i = 0; i < ports.length; i++) {
      if (ports[i].includes('FL STUDIO FIRE') || ports[i].includes('FIRE')) {
        foundPort = ports[i];
        break;
      }
    }
    
    if (!foundPort) {
      console.log(`\nError: Could not find "${OUTPUT_NAME}" MIDI output.`);
      console.log('Please ensure the Akai Fire is connected and powered on.');
      process.exit(1);
    }
    
    console.log(`\nUsing port: ${foundPort}`);
    
    try {
      midiOut = new easymidi.Output(foundPort);
      console.log('✓ Connected to Akai Fire\n');
      
      // Turn off all LEDs before starting probe
      await turnOffAllLEDs();
      
      console.log('Starting probe...\n');
      // Start probing
        askNext();
    } catch (err) {
      console.error('Error connecting to MIDI port:', err.message);
      process.exit(1);
    }
    
  } catch (err) {
    console.error('Error initializing MIDI:', err.message);
    process.exit(1);
  }
}

// Start the probe
init();
