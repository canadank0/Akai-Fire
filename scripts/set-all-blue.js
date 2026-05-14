#!/usr/bin/env node

/**
 * Set all 64 Fire pads to blue color
 * Intensity range: 0-100 (not 0-127)
 */

const midi = require('@julusian/midi');

async function openMIDI() {
  const midiOut = new midi.output();
  
  const portCount = midiOut.getPortCount();
  let portIndex = -1;
  
  for (let i = 0; i < portCount; i++) {
    const name = midiOut.getPortName(i);
    if (name.includes('FIRE')) {
      portIndex = i;
    }
  }
  
  if (portIndex === -1) {
    throw new Error('Could not find FL STUDIO FIRE');
  }
  
  midiOut.openPort(portIndex);
  console.log(`Connected to: ${midiOut.getPortName(portIndex)}\n`);
  
  return midiOut;
}

function sendSysEx(midiOut, bytes) {
  midiOut.sendMessage(bytes);
}

function setAllPadsBlue(midiOut) {
  console.log('Setting all 64 pads to blue (R=0 G=0 B=100)...');
  
  // Send blue color to all pads
  const padData = [];
  for (let i = 0; i < 64; i++) {
    padData.push(i, 0, 0, 100); // padIndex, red=0, green=0, blue=100 (max intensity)
  }
  
  const sysex = [
    0xF0, 0x47, 0x7F, 0x43, 0x65,
    0x02, 0x00,                    // Length: 256 (7-bit encoded)
    ...padData,
    0xF7
  ];
  
  sendSysEx(midiOut, sysex);
  console.log('All 64 pads set to blue (R=0 G=0 B=100)!');
  
  midiOut.closePort();
  process.exit(0);
}

async function main() {
  try {
    const midiOut = await openMIDI();
    setAllPadsBlue(midiOut);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
