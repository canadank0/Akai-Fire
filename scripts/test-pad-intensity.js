#!/usr/bin/env node

/**
 * Test pad LED intensity levels
 * Cycles through brightness values and waits for user feedback
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
    red, green, blue,
    0xF7
  ]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function testIntensityOnPad(padIndex = 0) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PAD INTENSITY TEST - Pad ${padIndex}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`I will cycle through RGB intensity values on pad ${padIndex}.`);
  console.log(`Watch the LED and tell me when you see a change.\n`);
  
  const observedValues = [];
  let lastColor = null;
  
  // Test with red channel only (varies 0-127)
  console.log(`--- Testing Red Channel Intensity ---`);
  console.log(`Starting from dim to bright...\n`);
  
  // Start with off
  sendPadColor(padIndex, 0, 0, 0);
  await sleep(500);
  console.log(`  Value 0: OFF`);
  
  let prevDetected = false;
  
  // Test values 1-20 first to find where changes happen
  for (let val = 1; val <= 20; val++) {
    sendPadColor(padIndex, val, 0, 0);
    await sleep(600);
    
    console.log(`  Sending value ${val}...`);
    const answer = await ask(`  Did you see a CHANGE from value ${val-1}? (yes/no) > `);
    
    if (answer.toLowerCase() === 'yes') {
      observedValues.push(val);
      console.log(`  Value ${val}: CHANGE DETECTED ✓\n`);
    } else {
      console.log(`  Value ${val}: No visible change\n`);
    }
  }
  
  // Now test higher values if we found changes in the first 20
  if (observedValues.length > 0) {
    console.log(`\n--- Testing Higher Values ---`);
    
    for (let val = 30; val <= 127; val += 10) {
      sendPadColor(padIndex, val, 0, 0);
      await sleep(600);
      
      console.log(`  Sending value ${val}...`);
      const answer = await ask(`  Did you see a CHANGE from previous? (yes/no) > `);
      
      if (answer.toLowerCase() === 'yes') {
        observedValues.push(val);
        console.log(`  Value ${val}: CHANGE DETECTED ✓\n`);
      } else {
        console.log(`  Value ${val}: No visible change\n`);
      }
    }
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`Observed intensity change points: [${observedValues.join(', ')}]`);
  console.log(`Total distinct brightness levels detected: ${observedValues.length + 1} (including off)`);
  
  const actualLevels = await ask(`How many distinct brightness levels did you actually see? (enter number) > `);
  
  return {
    padIndex,
    channel: 'red',
    observedChangePoints: observedValues,
    totalLevels: parseInt(actualLevels) || observedValues.length + 1
  };
}

async function testAllChannelsOnOnePad(padIndex = 0) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FULL RGB INTENSITY TEST - Pad ${padIndex}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const results = {};
  
  // Test each channel separately
  for (const channel of ['red', 'green', 'blue']) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`Testing ${channel.toUpperCase()} channel`);
    console.log(`${'─'.repeat(40)}`);
    
    // Start off
    sendPadColor(padIndex, 0, 0, 0);
    await sleep(300);
    
    const observedValues = [];
    
    // Quick test: values 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 127
    const testValues = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 127];
    
    for (const val of testValues) {
      const rgb = { red: 0, green: 0, blue: 0 };
      rgb[channel] = val;
      sendPadColor(padIndex, rgb.red, rgb.green, rgb.blue);
      await sleep(600);
      
      const answer = await ask(`  ${channel}=${val}: CHANGE detected? (yes/no) > `);
      
      if (answer.toLowerCase() === 'yes') {
        observedValues.push(val);
      }
    }
    
    results[channel] = {
      observedChangePoints: observedValues,
      testValues
    };
    
    console.log(`\n${channel.toUpperCase()} change points: [${observedValues.join(', ')}]\n`);
  }
  
  // Test combined RGB for full brightness range
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Testing FULL BRIGHTNESS (R=G=B)`);
  console.log(`${'─'.repeat(40)}`);
  
  const fullBrightnessValues = [];
  const brightnessTestValues = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 127];
  
  for (const val of brightnessTestValues) {
    sendPadColor(padIndex, val, val, val);
    await sleep(600);
    
    const answer = await ask(`  R=G=B=${val}: CHANGE detected? (yes/no) > `);
    
    if (answer.toLowerCase() === 'yes') {
      fullBrightnessValues.push(val);
    }
  }
  
  results.fullBrightness = {
    observedChangePoints: fullBrightnessValues
  };
  
  console.log(`\nFull brightness change points: [${fullBrightnessValues.join(', ')}]\n`);
  
  return results;
}

async function main() {
  try {
    await openMIDI();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PAD LED INTENSITY CHARACTERIZATION TOOL`);
    console.log(`${'='.repeat(60)}\n`);
    console.log(`This tool will test the brightness levels of Fire pads.`);
    console.log(`You need to watch the LED and report what you see.\n`);
    
    const padInput = await ask(`Which pad to test? (0-63, default=0) > `);
    const padIndex = parseInt(padInput) || 0;
    
    if (padIndex < 0 || padIndex > 63) {
      console.log(`Invalid pad index. Using pad 0.`);
    }
    
    const result = await testAllChannelsOnOnePad(padIndex);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FINAL RESULTS - Pad ${padIndex}`);
    console.log(`${'='.repeat(60)}`);
    console.log(JSON.stringify(result, null, 2));
    
    // Save results
    const fs = require('fs');
    const resultsDir = path.join(__dirname, 'docs');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const outputPath = path.join(resultsDir, 'pad-intensity-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      testedAt: new Date().toISOString(),
      padIndex,
      results
    }, null, 2));
    
    console.log(`\nResults saved to: ${outputPath}`);
    
    midiOut.closePort();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    if (midiOut) midiOut.closePort();
    process.exit(1);
  }
}

const path = require('path');
main().catch(console.error);
