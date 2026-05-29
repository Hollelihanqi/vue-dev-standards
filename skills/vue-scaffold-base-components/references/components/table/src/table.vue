<template>
  <div class="table-w h-[100%] w-full flex flex-col">
    <div v-if="$slots.tableHeader" class="table-header flex items-center">
      <div class="flex-1 flex items-center">
        <slot name="tableHeader"></slot>
      </div>
    </div>
    <ElTable
      ref="TableRef"
      v-qoding="requestApi ? _loading : loading"
      class="my-el-table w-[100%]"
      :class="{
        'pagination-hide-table': !cpaginationShow,
        'flex-1': !isDataEmpty || !_showSummary,
      }"
      :data="_tdata"
      :default-sort="_defaultSort"
      v-bind="$attrs"
      @sort-change="handleSortChange"
    >
      <!-- 默认插槽 -->
      <slot></slot>

      <template v-if="isDataEmpty" #append>
        <slot name="append"></slot>
      </template>
      <template #empty>
        <slot name="empty">
          <el-empty v-bind="emptyOptions" />
        </slot>
      </template>

      <template v-for="item in _columns" :key="item">
        <!-- selection || index -->
        <ElTableColumn
          v-if="
            _showColumn(item) &&
            (item.type === 'selection' || item.type === 'index')
          "
          v-bind="item"
          :align="item.align ?? 'center'"
          :reserve-selection="item.type === 'selection'"
        >
        </ElTableColumn>
        <!-- expand 支持 tsx 语法 && 作用域插槽 (tsx > slot) -->
        <ElTableColumn
          v-else-if="item.type === 'expand'"
          v-slot="scope"
          v-bind="item"
          :align="item.align ?? 'center'"
        >
          <component
            :is="item.render"
            v-if="item.render"
            :row="scope.row"
            v-bind="scope"
          >
          </component>
          <slot v-else :name="item.type" :row="scope.row"></slot>
        </ElTableColumn>
        <!-- other 循环递归 -->
        <TableColumn v-else-if="_showColumn(item)" :column="item">
          <template v-for="slot in Object.keys($slots)" #[slot]="scope">
            <slot
              :name="slot"
              :row="scope.row"
              :index="scope.$index"
              v-bind="scope"
            ></slot>
          </template>
        </TableColumn>
      </template>

      <slot name="inAction"></slot>
    </ElTable>
    <div v-if="_showSummary" class="flex-1 opacity-0 h-0 phd"></div>
    <ElPagination
      v-if="cpaginationShow"
      v-model:page-size="paginationParams.pageSize"
      v-model:current-page="paginationParams.currentPage"
      class="my-el-pagination"
      :layout="layout"
      :total="_total"
      :page-sizes="pageSizes"
      v-bind="paginationOptions"
      @update:page-size="handleSizeChange"
      @update:current-page="handlePageChange"
    ></ElPagination>
  </div>
</template>
<script lang="ts" setup>
import { useTemplateRef } from "vue";
import {
  ElPagination,
  ElTable,
  ElTableColumn,
  vLoading as vQoding,
} from "element-plus";

import TableColumn from "./components/TableColumn.vue";
import { tableEmits, tableProps } from "./table";
import useController from "./use-controller";
import useTable from "./use-table";
import "./table.scss";

defineOptions({
  name: "Table",
});

const props = defineProps(tableProps);
const emit = defineEmits(tableEmits);
const TableRef = useTemplateRef("TableRef");

const { _columns, _showColumn } = useController(props, TableRef);

const {
  _loading,
  cpaginationShow,
  isDataEmpty,
  _showSummary,
  _tdata,
  _total,
  _defaultSort,
  paginationParams,
  handleSortChange,
  handleSizeChange,
  handlePageChange,
  updateTableData,
  resetTableData,
  resetPage,
  updatePage,
  getData,
  clearSort,
} = useTable(props, TableRef, emit);

const legacyElementTableRefKey = "El" + "TableInstance";

defineExpose({
  [legacyElementTableRefKey]: TableRef,
  updateTableData,
  resetTableData,
  resetPage,
  updatePage,
  getData,
  tableData: _tdata,
  clearSort,
});
</script>
