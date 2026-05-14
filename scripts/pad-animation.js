#!/usr/bin/env node

/**
 * Fire Pad Animation Script
 * 
 * Animates the 64 pads (8x8 grid) with various effects:
 * - Red wave moving from right to left
 * - Gradient from red to white across columns
 * - And more...
 */

const midi = require('@julusian/midi');

let midiOut = null;

async function openMIDI() {
  midiOut = new midi.output();
  
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

function sendPadColor(padIndex, red, green, blue) {
  midiOut.sendMessage([
    0xF0, 0x47, 0x7F, 0x43, 0x65,
    0x00, 0x04,
    padIndex,
    Math.min(100, Math.max(0, red)),
    Math.min(100, Math.max(0, green)),
    Math.min(100, Math.max(0, blue)),
    0xF7
  ]);
}

function setAllPadsColor(red, green, blue) {
  const padData = [];
  for (let i = 0; i < 64; i++) {
    padData.push(i, 
      Math.min(100, Math.max(0, red)),
      Math.min(100, Math.max(0, green)),
      Math.min(100, Math.max(0, blue))
    );
  }
  
  midiOut.sendMessage([
    0xF0, 0x47, 0x7F, 0x43, 0x65,
    0x02, 0x00,
    ...padData,
    0xF7
  ]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fire pad layout: 8 columns x 8 rows
// Pad indices (0-63):
// Column 0: pads 0,8,16,24,32,40,48,56
// Column 1: pads 1,9,17,25,33,41,49,57
// ...
// Column 7: pads 7,15,23,31,39,47,55,63

function getPadIndex(column, row) {
  // column: 0-7 (left to right)
  // row: 0-7 (bottom to top, or top to bottom depending on orientation)
  return row * 8 + column;
}

// ============================================================
// ANIMATION: Red wave moving from right to left with gradient
// ============================================================

async function animateRedWave() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANIMATION: Red Wave (Right to Left with Gradient)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Red appears on rightmost column and moves left,`);
  console.log(`gradient from red to white across columns.\n`);
  
  const frames = 32;
  const speed = 100; // ms per frame
  
  for (let frame = 0; frame < frames; frame++) {
    // Clear all pads
    setAllPadsColor(0, 0, 0);
    
    // For each column (0-7)
    for (let col = 0; col < 8; col++) {
      // Gradient: rightmost (col 7) = red, leftmost (col 0) = white
      // Red channel decreases from right to left
      // Green and Blue channels increase from right to left
      
      const red = Math.round(100 * (1 - col / 7)); // 100 -> 0
      const green = Math.round(100 * (col / 7));   // 0 -> 100
      const blue = Math.round(100 * (col / 7));     // 0 -> 100
      
      // Wave position: moves from right to left
      const wavePos = (frame % 8);
      
      // Only light up pads near the wave position
      for (let row = 0; row < 8; row++) {
        const padIndex = getPadIndex(col, row);
        
        // Create wave effect: only certain columns/rows are lit
        const distFromWave = Math.abs(col - wavePos);
        
        if (distFromWave <= 1) {
          const brightness = distFromWave === 0 ? 100 : 50;
          sendPadColor(padIndex, 
            Math.round(red * brightness / 100),
            Math.round(green * brightness / 100),
            Math.round(blue * brightness / 100)
          );
        }
      }
    }
    
    await sleep(speed);
  }
  
  console.log(`Animation complete.\n`);
}

// ============================================================
// ANIMATION: Simple red-to-white gradient across columns
// ============================================================

async function animateGradient() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANIMATION: Red to White Gradient`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Column 7 (right) = Red, Column 0 (left) = White\n`);
  
  const frames = 16;
  
  for (let frame = 0; frame < frames; frame++) {
    const offset = frame % 8;
    
    for (let col = 0; col < 8; col++) {
      const gradientCol = (col + offset) % 8;
      
      // Red decreases from right to left, green/blue increase
      const red = Math.round(100 * (1 - gradientCol / 7));
      const green = Math.round(100 * (gradientCol / 7) * 0.3);
      const blue = Math.round(100 * (gradientCol / 7));
      
      for (let row = 0; row < 8; row++) {
        const padIndex = getPadIndex(col, row);
        sendPadColor(padIndex, red, green, blue);
      }
    }
    
    await sleep(150);
  }
  
  console.log(`Animation complete.\n`);
}

// ============================================================
// ANIMATION: Red pulse from right to left
// ============================================================

async function animateRedPulse() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANIMATION: Red Pulse Wave (Right to Left)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`A red pulse travels from column 7 to column 0.\n`);
  
  const speed = 80;
  const totalFrames = 64;
  
  for (let frame = 0; frame < totalFrames; frame++) {
    setAllPadsColor(0, 0, 0);
    
    for (let col = 0; col < 8; col++) {
      // Wave moves from right (col 7) to left (col 0)
      const wavePos = 7 - (frame % 8);
      const dist = Math.abs(col - wavePos);
      
      if (dist <= 2) {
        const brightness = dist === 0 ? 100 : dist === 1 ? 60 : 30;
        
        for (let row = 0; row < 8; row++) {
          const padIndex = getPadIndex(col, row);
          sendPadColor(padIndex, brightness, 0, 0);
        }
      }
    }
    
    await sleep(speed);
  }
  
  console.log(`Animation complete.\n`);
}

// ============================================================
// ANIMATION: Rainbow cycle
// ============================================================

async function animateRainbow() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANIMATION: Rainbow Cycle`);
  console.log(`${'='.repeat(60)}`);
  
  const frames = 128;
  
  for (let frame = 0; frame < frames; frame++) {
    const hue = (frame / frames) * 360;
    
    for (let col = 0; col < 8; col++) {
      const hueOffset = (col / 8) * 360;
      const currentHue = (hue + hueOffset) % 360;
      
      const rgb = hslToRgb(currentHue, 100, 50);
      
      for (let row = 0; row < 8; row++) {
        const padIndex = getPadIndex(col, row);
        sendPadColor(padIndex, rgb.r, rgb.g, rgb.b);
      }
    }
    
    await sleep(50);
  }
  
  console.log(`Animation complete.\n`);
}

// ============================================================
// HELPER: HSL to RGB conversion
// ============================================================

function hslToRgb(hue, saturation, lightness) {
  // Normalize hue to 0-360, sat and light to 0-1
  hue = hue % 360;
  saturation /= 100;
  lightness /= 100;
  
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = lightness - c / 2;
  
  let r, g, b;
  
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  // Scale to 0-100 range (Fire pad intensity)
  return {
    r: Math.round((r + m) * 100),
    g: Math.round((g + m) * 100),
    b: Math.round((b + m) * 100)
  };
}

// ============================================================
// MENU
// ============================================================

async function showMenu() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FIRE PAD ANIMATIONS`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`1. Red Wave (Right to Left with Gradient)`);
  console.log(`2. Red to White Gradient`);
  console.log(`3. Red Pulse Wave`);
  console.log(`4. Rainbow Cycle`);
  console.log(`5. All Red (static)`);
  console.log(`6. All White (static)`);
  console.log(`0. Turn all off and exit\n`);
}

async function main() {
  try {
    await openMIDI();
    
    let running = true;
    
    while (running) {
      await showMenu();
      
      const answer = await ask(`Choose animation (0-6) > `);
      
      switch (answer.trim()) {
        case '1':
          await animateRedWave();
          break;
        case '2':
          await animateGradient();
          break;
        case '3':
          await animateRedPulse();
          break;
        case '4':
          await animateRainbow();
          break;
        case '5':
          console.log(`Setting all pads to red...`);
          setAllPadsColor(100, 0, 0);
          await sleep(2000);
          break;
        case '6':
          console.log(`Setting all pads to white...`);
          setAllPadsColor(100, 100, 100);
          await sleep(2000);
          break;
        case '0':
          setAllPadsColor(0, 0, 0);
          console.log(`\nAll pads turned off. Exiting.\n`);
          running = false;
          break;
        default:
          console.log(`Invalid option.\n`);
      }
    }
    
    midiOut.closePort();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    if (midiOut) midiOut.closePort();
    process.exit(1);
  }
}

function ask(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    
    const handler = (data) => {
      const input = data.toString().trim();
      process.stdin.removeListener('data', handler);
      resolve(input);
    };
    
    process.stdin.on('data', handler);
  });
}

main().catch(console.error);
