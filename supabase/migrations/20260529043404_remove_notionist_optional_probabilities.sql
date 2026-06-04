-- Remove probability controls for Eyes, Clothing, Eyebrows and Nose in the
-- notionist style so those features are always rendered instead of being optional.
DELETE FROM atributo_avatar
WHERE id IN (
  36, -- clothingProbability  (notionist)
  38, -- eyebrowsProbability  (notionist)
  39, -- eyesProbability      (notionist)
  44  -- noseProbability      (notionist)
);
