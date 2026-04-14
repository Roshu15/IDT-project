function simulateTemperature() {
  return Number((20 + Math.random() * 12).toFixed(1));
}

function simulateStudents() {
  const rand = Math.random();
  if (rand < 0.2) return 0;
  if (rand < 0.6) return Math.floor(Math.random() * 15) + 1;
  return Math.floor(Math.random() * 25) + 10;
}

function generateFallbackSensors() {
  return {
    temperature: simulateTemperature(),
    students: simulateStudents(),
  };
}

module.exports = {
  simulateTemperature,
  simulateStudents,
  generateFallbackSensors,
};
