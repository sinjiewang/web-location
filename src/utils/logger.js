function getTagged(tag) {
  return Object.keys(console).reduce((acc, curr) => ({
    ...acc,
    [curr]: (...args) => {
      console[curr](tag, ...args)
    }
  }), {});
}

export {
  getTagged
};
