<template>
  <div class="pro-table-w h-[100%] w-[100%] flex flex-col overflow-hidden gap-2">
    <search-form
      v-if="!searchFormHide"
      ref="SearchFormInstance"
      class="mb-[8px]"
      okpos="left"
      is-reset-params
      :collapsed-rows="2"
      collapse
      v-bind="$attrs"
      @on-search="handleSearch"
      @on-reset="handleReset"
    >
    </search-form>
    <div class="ptable-box flex-1 h-0 p-[16px] bg-white">
      <HTable
        ref="HTableRef"
        :request-api="requestApi"
        :request-auto="false"
        :table-action-is-call-api="false"
        :default-sort="_defaultSort"
        stripe
        highlight-current-row
        v-bind="$attrs"
        @on-table="handleTableChange"
      >
        <template v-for="slotName in slotNames" #[slotName]="scope">
          <slot :name="slotName" v-bind="scope"></slot>
        </template>
      </HTable>
    </div>
  </div>
</template>
<script lang="ts" setup>
import SearchForm from "@/components/search-form";
import HTable from "@/components/table";

import useTable from "./use-table";
defineOptions({
  name: "ProTable",
});
const props = defineProps({
  searchFormHide: {
    type: Boolean,
    default: false,
  },
  requestApi: {
    type: Function,
    default: null,
  },
  requestAuto: {
    type: Boolean,
    default: true,
  },
  searchModelFormat: {
    type: Function,
    default: null,
  },
  otherRequestParams: {
    type: [Function, Object],
    default: () => ({}),
  },
  defaultSort: {
    type: [Function, Object],
    default: () => ({}),
  },
  onSearch: {
    type: Function,
    default: null,
  },
});

const {
  HTableRef,
  slotNames,
  _defaultSort,
  handleSearch,
  handleReset,
  _updateTableData,
  _resetTableData,
  handleTableChange,
} = useTable(props);

const legacyElementTableRefKey = "El" + "TableInstance";
const legacyGetElementTableRefKey = "get" + "El" + "TableInstance";

defineExpose({
  [legacyGetElementTableRefKey]: () => HTableRef.value?.[legacyElementTableRefKey],
  updateTableData: _updateTableData,
  resetTableData: _resetTableData,
  resetPage: () => HTableRef.value?.resetPage(),
  updatePage: (params = {}) => HTableRef.value?.updatePage(params),
  getData: () => HTableRef.value?.getData(),
  resetSearch: handleReset,
});
</script>

<style scoped>
.ptable-box {
  border-radius: 8px;
  overflow: hidden;
}
</style>
