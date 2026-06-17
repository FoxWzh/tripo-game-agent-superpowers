export const PRICING_SOURCE_URL = 'https://docs.tripo3d.ai/zh/get-started/pricing.html';

const MODEL_BASE_CREDITS = {
  image_to_model: {
    P1: 40,
    H3: 20,
    H2: 20,
    Turbo: 5,
    v14: 20
  },
  multiview_to_model: {
    P1: 50,
    H3: 30,
    H2: 30
  },
  text_to_model: {
    P1: 30,
    H3: 10,
    H2: 10,
    Turbo: 5,
    v14: 10
  }
};

const TEXTURE_QUALITY_CREDITS = {
  standard: 10,
  detailed: 20,
  extreme: 30
};

export function estimateConversionCredits(options = {}) {
  const items = [{ label: 'format conversion', credits: 5 }];
  const usesAdvancedConversion = Boolean(
    options.quad
    || options.face_limit
    || options.smart_low_poly
    || options.texture_format
    || options.pivot_to_center_bottom
    || options.fbx_preset
  );
  if (usesAdvancedConversion) {
    items.push({ label: 'conversion advanced parameters', credits: 5 });
  }
  return {
    total: items.reduce((sum, item) => sum + item.credits, 0),
    items
  };
}

export function estimateCredits({ taskType = 'image_to_model', modelFamily = 'P1', textureQuality = 'standard', needsConversion = true, conversionOptions = {}, rigRequired = false, includeGeneratedMultiview = false } = {}) {
  const items = [];
  const base = MODEL_BASE_CREDITS[taskType]?.[modelFamily] ?? MODEL_BASE_CREDITS.image_to_model.P1;
  items.push({ label: `${taskType} (${modelFamily})`, credits: base });

  if (textureQuality && TEXTURE_QUALITY_CREDITS[textureQuality]) {
    items.push({ label: `texture_quality=${textureQuality}`, credits: TEXTURE_QUALITY_CREDITS[textureQuality] });
  }

  if (includeGeneratedMultiview) {
    items.push({ label: 'optional multiview image generation', credits: 10 });
  }

  if (needsConversion) {
    items.push(...estimateConversionCredits(conversionOptions).items);
  }

  if (rigRequired) {
    items.push({ label: 'auto rig', credits: 25 });
  }

  const total = items.reduce((sum, item) => sum + item.credits, 0);
  return {
    total,
    items,
    source: PRICING_SOURCE_URL,
    notes: [
      'Pre-rig check is free according to Tripo pricing.',
      'Actual task results can include consumed_credit from GET /v2/openapi/task/{task_id}.'
    ]
  };
}

export function formatCreditEstimate(estimate) {
  const lines = [`Estimated credits: ${estimate.total}`];
  for (const item of estimate.items) {
    lines.push(`- ${item.label}: ${item.credits}`);
  }
  return lines.join('\n');
}
