export const sanitizeCssVariableName = (label: string) => {
  return label
    .replace(/ /g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "_");
};
