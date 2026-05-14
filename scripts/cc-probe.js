#!/usr/bin/env node

/**
 * CC Probe - Systematically test which CC values light up function button LEDs
 * 
 * Iterates through CC numbers 0-127 with values 0-4 to identify
 * which controllers correspond to which button LEDs.
 * 
 * Usage: node cc-probe.js
 */

const midi = require('@julusian/midi');

const FIRE_PORT = 3;
const OUTPUT_NAME = 'FL STUDIO FIRE';

let midiOut = null;

async function openMIDI() {
  midiOut = new midi.output();
  
  // Find the Fire port
  const portCount = midiOut.getPortCount();
  let portIndex = -1;
  
  for (let i = 0; i < portCount; i++) {
    const name = midiOut.getPortName(i);
    console.log(`Port ${i}: ${name}`);
    if (name.includes('FIRE') || name.includes(OUTPUT_NAME)) {
      portIndex = i;
    }
  }
  
  if (portIndex === -1) {
    console.error(`Error: Could not find ${OUTPUT_NAME}`);
    process.exit(1);
  }
  
  midiOut.openPort(portIndex);
  console.log(`\nConnected to: ${midiOut.getPortName(portIndex)}\n`);
}

function sendCC(controller, value) {
  midiOut.sendMessage([0xB0, controller, value]);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function probeCC(controller, value) {
  sendCC(controller, value);
}

async function runProbe() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  console.log('CC Button LED Probe');
  console.log('===================\n');
  console.log('This will test CC values to find button LEDs.');
  console.log('For each CC, we try values 0-4 and ask if any button lit up.\n');
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  // Results storage
  const results = [];
  
  // First, turn all LEDs off
  console.log('Turning all LEDs off...');
  sendCC(127, 0);
  await delay(300);
  
  // Test CC values 0-127
  for (let cc = 0; cc <= 127; cc++) {
    console.log(`\n--- Testing CC ${cc} (0x${cc.toString(16).toUpperCase()}) ---`);
    
    let found = false;
    
    for (let value = 0; value <= 4; value++) {
      // Send the test
      sendCC(cc, value);
      console.log(`  Sent CC ${cc} = ${value}`);
      await delay(200);
    }
    
    // Ask user
    const answer = await question('  Did any button LED light up? (y/n) > ');
    
    if (answer.toLowerCase() === 'y') {
      const buttonName = await question('  Which button? (name or number) > ');
      
      // Test which values work for this CC
      const workingValues = [];
      for (let value = 1; value <= 4; value++) {
        sendCC(cc, 0); // Turn off first
        await delay(100);
        sendCC(cc, value);
        await delay(100);
        
        const vAnswer = await question(`    Value ${value} visible? (y/n) > `);
        if (vAnswer.toLowerCase() === 'y') {
          workingValues.push(value);
        }
      }
      
      // Turn off this CC
      sendCC(cc, 0);
      
      results.push({
        cc: cc,
        buttonName: buttonName.trim(),
        workingValues: workingValues
      });
      
      console.log(`  ✓ Recorded: CC ${cc} = ${buttonName.trim()} (values: ${workingValues.join(', ')})`);
    }
    
    // Small delay between CC tests
    await delay(100);
  }
  
  // Final cleanup - turn all off
  console.log('\n\nTurning all LEDs off...');
  sendCC(127, 0);
  
  // Save results
  console.log('\n\n=== Probe Complete ===');
  console.log(`Found ${results.length} button LED controllers:\n`);
  
  for (const r of results) {
    console.log(`  CC ${r.cc} (0x${r.cc.toString(16).toUpperCase()}): ${r.buttonName} - Values: ${r.workingValues.join(', ')}`);
  }
  
  // Save to file
  const fs = require('fs');
  const output = {
    probeDate: new Date().toISOString(),
    device: 'Akai Fire',
    controllers: results
  };
  
  const filename = 'docs/cc-probe-results.json';
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${filename}`);
  
  rl.close();
  midiOut.closePort();
  process.exit(0);
}

async function main() {
  await openMIDI();
  await runProbe();
}

main().catch(console.error);
