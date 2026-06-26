import { state } from "./state.js";
import { normalizeGoal, round, formatSigned, measurementsFor, latestMeasurementFor } from "./helpers.js";

export function goalProgress(member) {
  const memberMeasurements = measurementsFor(member.id);
  const latest = memberMeasurements[0];
  const previous = memberMeasurements[1];
  const first = memberMeasurements[memberMeasurements.length - 1];
  const emptyMeasurement = { weight: 0, bodyFat: 0, muscleMass: 0, waist: 0, visceralFat: 0, bmi: 0, strength: 0 };
  const measurementValues = (measurement) => measurement ? {
    weight: Number(measurement.weight || 0),
    bodyFat: Number(measurement.body_fat || 0),
    muscleMass: Number(measurement.muscle_mass || 0),
    waist: Number(measurement.waist || 0),
    visceralFat: Number(measurement.visceral_fat || 0),
    bmi: Number(measurement.bmi || 0),
    strength: 0,
  } : emptyMeasurement;
  const current = latest ? {
    weight: Number(latest.weight),
    bodyFat: Number(latest.body_fat),
    muscleMass: Number(latest.muscle_mass),
    waist: Number(latest.waist),
    visceralFat: Number(latest.visceral_fat || 0),
    bmi: Number(latest.bmi || 0),
    strength: 0,
  } : emptyMeasurement;
  const baseline = measurementValues(first || latest);
  const previousCurrent = previous ? measurementValues(previous) : null;
  const fatMassStart = baseline.weight * baseline.bodyFat / 100;
  const fatMassNow = current.weight * current.bodyFat / 100;
  const metrics = {
    weightChange: round(current.weight - baseline.weight, 1),
    muscleGain: round(current.muscleMass - baseline.muscleMass, 1),
    bodyFatChange: round(current.bodyFat - baseline.bodyFat, 1),
    bodyFatReduced: round(baseline.bodyFat - current.bodyFat, 1),
    fatMassLost: round(fatMassStart - fatMassNow, 1),
    waistReduced: round(baseline.waist - current.waist, 1),
    strengthImprovement: round(current.strength - baseline.strength, 0),
    weeklyMuscleGain: previousCurrent ? round(current.muscleMass - previousCurrent.muscleMass, 1) : 0,
    weeklyFatLoss: previousCurrent ? round(previousCurrent.bodyFat - current.bodyFat, 1) : 0,
    weeklyVisceralFatLoss: previousCurrent ? round(previousCurrent.visceralFat - current.visceralFat, 1) : 0,
    weeklyBmiReduced: previousCurrent ? round(previousCurrent.bmi - current.bmi, 1) : 0,
    visceralSingleDigit: latest ? Number(latest.visceral_fat) < 10 : false,
    hasPrevious: !!previousCurrent,
  };
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") return scoreWeightGain(metrics);
  if (goal === "loss") return scoreWeightLoss(metrics);
  return scoreBodyComposition(metrics);
}

export function scoreWeightLoss(metrics) {
  const formula = weeklyScoreFormula(metrics);
  return {
    ...metrics,
    ...formula,
    driver: metrics.hasPrevious ? `Fat loss ${formatSigned(metrics.fatMassLost)} kg, muscle ${formatSigned(metrics.muscleGain)} kg` : "No previous measurement",
    weights: "Muscle Gain 40x, Fat Loss 20x, Visceral Fat Loss 20x, BMI Reduction 10x",
  };
}

export function scoreWeightGain(metrics) {
  const formula = weeklyScoreFormula(metrics);
  return {
    ...metrics,
    ...formula,
    healthyWeightGain: Math.max(metrics.weightChange, 0),
    bodyCompositionImprovement: round(metrics.muscleGain - Math.max(metrics.bodyFatChange, 0) * 0.35, 1),
    driver: metrics.hasPrevious ? `Muscle ${formatSigned(metrics.muscleGain)} kg, weight ${formatSigned(metrics.weightChange)} kg` : "No previous measurement",
    weights: "Muscle Gain 40x, Fat Loss 20x, Visceral Fat Loss 20x, BMI Reduction 10x",
  };
}

export function scoreBodyComposition(metrics) {
  const formula = weeklyScoreFormula(metrics);
  return {
    ...metrics,
    ...formula,
    driver: metrics.hasPrevious ? `Muscle ${formatSigned(metrics.muscleGain)} kg, body fat ${formatSigned(-metrics.bodyFatReduced)}%` : "No previous measurement",
    weights: "Muscle Gain 40x, Fat Loss 20x, Visceral Fat Loss 20x, BMI Reduction 10x",
  };
}

export function weeklyScoreFormula(metrics) {
  if (!metrics.hasPrevious) {
    return { score: 0, scoreBreakdown: { muscleScore: 0, fatScore: 0, visceralLossScore: 0, bmiScore: 0 } };
  }
  const muscleScore = Math.max(metrics.weeklyMuscleGain, 0) * 40;
  const fatScore = Math.max(metrics.weeklyFatLoss, 0) * 20;
  const visceralLossScore = metrics.weeklyVisceralFatLoss > 0 ? metrics.weeklyVisceralFatLoss * 20 : metrics.visceralSingleDigit ? 10 : 0;
  const bmiScore = Math.max(metrics.weeklyBmiReduced, 0) * 10;
  return {
    score: Math.round(muscleScore + fatScore + visceralLossScore + bmiScore),
    scoreBreakdown: {
      muscleScore: round(muscleScore, 1),
      fatScore: round(fatScore, 1),
      visceralLossScore: round(visceralLossScore, 1),
      bmiScore: round(bmiScore, 1),
    },
  };
}

export function goalMetricCards(member, progress) {
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") {
    return [
      { label: "Muscle Gained", value: `${formatSigned(progress.muscleGain)} kg`, sub: "top priority", color: "bg-emerald" },
      { label: "Healthy Weight Gained", value: `${formatSigned(progress.healthyWeightGain)} kg`, sub: "lean gain focus", color: "bg-primary" },
      { label: "Strength Improvement", value: `+${progress.strengthImprovement}`, sub: "training signal", color: "bg-violet" },
      { label: "Body Composition", value: `${formatSigned(progress.bodyCompositionImprovement)}`, sub: "muscle over fat", color: "bg-blue" },
    ];
  }
  if (goal === "loss") {
    return [
      { label: "Fat Lost", value: `${formatSigned(progress.fatMassLost)} kg`, sub: "highest priority", color: "bg-emerald" },
      { label: "Muscle Gained", value: `${formatSigned(progress.muscleGain)} kg`, sub: "preserve or build", color: "bg-primary" },
      { label: "Body Fat Reduced", value: `${formatSigned(progress.bodyFatReduced)}%`, sub: "composition change", color: "bg-blue" },
      { label: "Waist Reduced", value: `${formatSigned(progress.waistReduced)} cm`, sub: "shape marker", color: "bg-violet" },
    ];
  }
  return [
    { label: "Muscle Gained", value: `${formatSigned(progress.muscleGain)} kg`, sub: "body composition", color: "bg-primary" },
    { label: "Body Fat Reduced", value: `${formatSigned(progress.bodyFatReduced)}%`, sub: "composition change", color: "bg-blue" },
    { label: "Waist Reduced", value: `${formatSigned(progress.waistReduced)} cm`, sub: "fitness marker", color: "bg-violet" },
    { label: "Goal Score", value: progress.score, sub: "balanced progress", color: "bg-emerald" },
  ];
}

export function weeklyInsight(member, progress) {
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") {
    return `Great progress! You gained ${Math.max(progress.muscleGain, 0).toFixed(1)} kg of lean muscle and changed overall body weight by ${formatSigned(progress.weightChange)} kg, supporting your weight gain goal.`;
  }
  if (goal === "loss") {
    return `Excellent progress! You gained or preserved ${formatSigned(progress.muscleGain)} kg of muscle while losing ${formatSigned(progress.fatMassLost)} kg of body fat. This indicates healthy body recomposition.`;
  }
  return `Strong body composition progress: muscle changed by ${formatSigned(progress.muscleGain)} kg while body fat moved ${formatSigned(progress.bodyFatChange)}%.`;
}

export function goalPrinciple(goal) {
  if (normalizeGoal(goal) === "gain") return "Success prioritizes muscle gain, healthy weight gain, and improved body composition.";
  if (normalizeGoal(goal) === "loss") return "Success prioritizes fat loss and muscle preservation before scale-weight reduction.";
  return "Success prioritizes body composition improvement over simple scale-weight changes.";
}

export function goalLeaderboard(goal, members = state.members) {
  return members
    .filter((member) => member.goal === goal)
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
}

export function goalLeaderboardNote(goal) {
  if (normalizeGoal(goal) === "gain") return "Ranked by muscle gain, healthy weight gain, and body composition improvement.";
  if (normalizeGoal(goal) === "loss") return "Ranked by fat loss, muscle preservation/gain, body fat reduction, and only lightly by scale weight.";
  return "Ranked by balanced body composition progress.";
}

export function topBy(scoreFn, members = state.members) {
  return members
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => scoreFn(b) - scoreFn(a));
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function overallBadge(entry, index) {
  return ["Champion", "Runner Up", "Third Place", "Top Performer"][index] || "Top Performer";
}

export function visceralImprovement(entry) {
  const history = measurementsFor(entry.member.id);
  if (history.length < 2) return 0;
  return Math.max(0, Number(history[1].visceral_fat || 0) - Number(history[0].visceral_fat || 0));
}

export function idealDistance(member) {
  const latest = latestMeasurementFor(member.id);
  if (!latest || latest.ideal_weight === null || latest.ideal_weight === undefined) return Number.POSITIVE_INFINITY;
  return Math.abs(Number(latest.weight) - Number(latest.ideal_weight));
}

export function idealPace(member) {
  const history = measurementsFor(member.id);
  if (history.length < 2) return 0;
  const latest = history[0];
  const previous = history[1];
  const target = Number(latest.ideal_weight);
  if (!Number.isFinite(target)) return 0;
  const previousDistance = Math.abs(Number(previous.weight) - target);
  const currentDistance = Math.abs(Number(latest.weight) - target);
  return Math.max(previousDistance - currentDistance, 0);
}
