// Stack-room layout constants (meters), split out from stacks.js to avoid a
// circular import: room.js and entry.js both need STACKS but are themselves
// imported by stacks.js.
export const STACKS = {
  unitLength: 4.6,
  unitThickness: 0.74,
  caseDepth: 0.36,
  aisleWidth: 2.0,
  pitch: 2.74,
  rowBottoms: [0.52, 1.36, 2.2],
  caseTop: 3.6,
  ceiling: 4.3,
  eyeHeight: 1.7,
  playerRadius: 0.3,
  walkwayDepth: 3.2,
  entryDepth: 5.0,
};
