const sortFiles = (origFiles: string[], origPriorities: string[]) => {
  const priorities = [...origPriorities].reverse().map((p) => p.toLowerCase());
  const files = origFiles.map((file: string) => ({
    original: file,
    lower: file.toLowerCase(),
  }));
  const rank = (file: any) => priorities.indexOf(file) + 1;

  return files
    .sort(
      (a: { lower: any }, b: { lower: any }) => rank(b.lower) - rank(a.lower)
    )
    .map((file: { original: any }) => file.original);
};

export default sortFiles;
