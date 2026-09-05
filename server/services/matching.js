export const matchWeights = {
  availability: 30,
  distance: 20,
  skills: 20,
  reliability: 15,
  experience: 10,
  pay: 5
};

function skillScore(workerSkills = [], shiftSkills = []) {
  if (!shiftSkills.length) return 100;
  const normalized = workerSkills.map((skill) => skill.toLowerCase());
  const matches = shiftSkills.filter((skill) => normalized.includes(skill.toLowerCase())).length;
  return Math.round((matches / shiftSkills.length) * 100);
}

function availabilityScore(availability = [], shift) {
  // Parse date as local time by replacing dashes to avoid UTC midnight offset
  const parts = (shift.date || "").split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 70;
  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  if (isNaN(parsed.getTime())) return 70;
  const dayText = parsed.toLocaleDateString("en-US", { weekday: "short" });
  const daySlot = availability.find((item) => item.day === dayText);
  if (!daySlot) return 70;
  if (daySlot.status === "Unavailable") return 20;
  if (daySlot.status === "Limited") return 78;
  return 100;
}

function distanceScore(workerProfile, shift) {
  if (!workerProfile?.location || !shift.location) return 78;
  if (workerProfile.location.toLowerCase() === shift.location.toLowerCase()) return 96;
  return 82;
}

function payScore(workerProfile, shift) {
  const expected = workerProfile?.expectedHourlyWage || 125;
  const hours = Number.parseFloat(shift.duration) || 4;
  const hourly = shift.paymentType === "hourly" ? shift.paymentAmount : shift.paymentAmount / Math.max(hours, 1);
  return hourly >= expected ? 100 : Math.max(40, Math.round((hourly / expected) * 100));
}

export function calculateMatch(shift, workerProfile) {
  const components = {
    availability: availabilityScore(workerProfile?.availability, shift),
    distance: distanceScore(workerProfile, shift),
    skills: skillScore(workerProfile?.skills, shift.requiredSkills),
    reliability: workerProfile?.reliabilityScore || 80,
    experience: Math.min(100, 70 + (workerProfile?.completedShifts || 0)),
    pay: payScore(workerProfile, shift)
  };

  const score = Math.round(
    Object.entries(matchWeights).reduce((total, [key, weight]) => total + (components[key] * weight) / 100, 0)
  );

  return {
    score,
    components,
    reasons: [
      components.availability >= 80 ? "Available for the shift window" : "Availability may need confirmation",
      components.distance >= 90 ? "Nearby location match" : "Within service distance",
      components.skills >= 70 ? "Relevant skills" : "Some skills can be learned on shift",
      `${components.reliability}% reliability signal`,
      components.pay >= 90 ? "Pay expectation matches" : "Pay is below preferred rate"
    ]
  };
}
