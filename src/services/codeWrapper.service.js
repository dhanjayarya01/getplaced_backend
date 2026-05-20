/**
 * Wrapping is handled only by dsa-worker using per-problem `runners` in MongoDB.
 * This module is kept so legacy imports do not break.
 */
export const wrapCode = () => {
  throw new Error(
    'Code wrapping moved to dsa-worker. Each problem stores runners.{lang}.template in the database.'
  );
};

export default { wrapCode };
