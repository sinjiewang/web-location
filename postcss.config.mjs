export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 16, // 基礎字體大小，你可以根據你的需求進行調整。
      unitPrecision: 5, // 轉換後的小數位數。
      propList: ['*'], // 可以從 px 轉為 rem 的屬性列表，['*'] 代表所有屬性都要轉換。
      selectorBlackList: [], // 黑名單中的選擇器將忽略轉換。
      replace: true,
      mediaQuery: false, // 允許在媒體查詢中轉換 `px`。
      minPixelValue: 0, // 設置要替換的最小像素值。
    },
  },
}
