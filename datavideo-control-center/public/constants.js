/* global window */
(function initDatavideoConstants(global) {
  global.DVIPConstants = {
    FLEX_WINDOW_COUNT: 4,
    POS_RAW_LIMIT: 1,
    SCALE_RAW_MAX: 1,
    FLEX_POS_MIN: -100,
    FLEX_POS_MAX: 100,
    FLEX_SIZE_MIN: 0,
    FLEX_SIZE_MAX: 100,
    SOURCE_CHOICES_DVIP: [
      { id: 0, label: 'Black' },
      { id: 1, label: 'In 1' },
      { id: 2, label: 'In 2' },
      { id: 3, label: 'In 3' },
      { id: 4, label: 'In 4' },
      { id: 5, label: 'In 5' },
      { id: 6, label: 'In 6' },
      { id: 7, label: 'In 7' },
      { id: 8, label: 'In 8' },
      { id: 9, label: 'In 9' },
      { id: 10, label: 'In 10' },
      { id: 11, label: 'In 11' },
      { id: 12, label: 'In 12' },
      { id: 17, label: 'Matte' },
      { id: 18, label: 'Bars' },
      { id: 19, label: 'Still 1' },
      { id: 20, label: 'Still 2' },
      { id: 21, label: 'Flex' },
    ],
    SOURCE_CHOICES_3200: null,
    QUAD_POSITIONS: {
      1: { x: -0.5, y: 0.5 },
      2: { x: 0.5, y: 0.5 },
      3: { x: -0.5, y: -0.5 },
      4: { x: 0.5, y: -0.5 },
    },
    FLEX_QUAD_POSITIONS: {
      1: { x: -0.5, y: 0.5 },
      2: { x: 0.5, y: 0.5 },
      3: { x: -0.5, y: -0.5 },
      4: { x: 0.5, y: -0.5 },
    },
  };
  if (!global.DVIPConstants.SOURCE_CHOICES_3200) global.DVIPConstants.SOURCE_CHOICES_3200 = global.DVIPConstants.SOURCE_CHOICES_DVIP;
}(window));
