// leveling.js
const { EmbedBuilder } = require('discord.js');

// ---- XP Configuration ----
const XP_MIN = 5;          // Minimum XP per message
const XP_MAX = 15;          // Maximum XP per message
const XP_COOLDOWN = 60000;  // 60 seconds cooldown per user (anti-spam)

// Formula para sa XP needed para sa next level
// Level 1 → 100 XP, Level 2 → 200 XP, Level 3 → 300 XP, etc.
function xpForLevel(level) {
  return 100 * level;
}

// Total XP needed para maabot ang specific level
function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

// Kunin ang level base sa total XP
function getLevelFromXp(totalXp) {
  let level = 0;
  let xpNeeded = 0;
  while (true) {
    const nextLevelXp = xpForLevel(level + 1);
    if (totalXp >= xpNeeded + nextLevelXp) {
      xpNeeded += nextLevelXp;
      level++;
    } else {
      break;
    }
  }
  return { level, currentXp: totalXp - xpNeeded, nextLevelXp: xpForLevel(level + 1) };
}

module.exports = {
  xpForLevel,
  totalXpForLevel,
  getLevelFromXp,
  XP_MIN,
  XP_MAX,
  XP_COOLDOWN
};