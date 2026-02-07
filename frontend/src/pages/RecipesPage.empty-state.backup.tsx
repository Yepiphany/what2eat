// 暂无菜谱页面样式备份
// 创建时间: 2026-02-07
// 使用位置: RecipesPage.tsx 中 displayRecipes.length === 0 的情况

<div className="text-center py-8">
  {/* 图标容器 - 大圆形背景 */}
  <div className="w-64 h-64 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <span className="text-8xl">📖</span>
  </div>
  
  {/* 标题和按钮水平排列 */}
  <div className="flex items-center justify-center space-x-4">
    {/* 标题 - 灰色 */}
    <h3 className="text-2xl font-semibold text-gray-400">
      暂无菜谱
    </h3>
    
    {/* 获取推荐按钮 - 圆角矩形 */}
    <button
      onClick={handleRefresh}
      className="px-8 py-4 bg-primary-500 text-white text-xl font-medium rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl"
    >
      获取推荐
    </button>
  </div>
</div>

/* 样式说明:
 * - 容器: py-8 (上下内边距)
 * - 图标容器: w-64 h-64 (256px x 256px), bg-gray-100 (浅灰背景), rounded-full (圆形)
 * - 图标: text-8xl (大图标)
 * - 图标下边距: mb-4
 * - 标题和按钮: flex items-center justify-center space-x-4 (水平排列，居中，间距4)
 * - 标题: text-2xl (字体大小), font-semibold (字重), text-gray-400 (灰色)
 * - 按钮: px-8 py-4 (内边距), bg-primary-500 (主色背景), text-white (白色文字)
 *         text-xl (字体大小), font-medium (字重), rounded-xl (圆角矩形)
 *         hover:bg-primary-600 (悬停效果), shadow-lg (阴影), hover:shadow-xl (悬停阴影)
 */
