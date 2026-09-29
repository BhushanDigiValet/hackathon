const fs = require('fs');
const path = 'src/entities.ts';
let content = fs.readFileSync(path, 'utf8');

const parts = content.split('/**\n * Master table for Atmosphere and Mood options.');
const originalTop = parts[0];
const appendedClasses = '/**\n * Master table for Atmosphere and Mood options.' + parts[1];

const allEntitiesMatch = originalTop.match(/export const ALL_ENTITIES = \[[\s\S]*?\];/);
const allEntitiesString = allEntitiesMatch[0];

const newTop = originalTop.replace(allEntitiesString, '');

const finalContent = newTop + '\n' + appendedClasses + '\n\n' + allEntitiesString + '\n';
fs.writeFileSync(path, finalContent);
console.log('Fixed entities.ts');
