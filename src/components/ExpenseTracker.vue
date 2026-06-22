<template>
  <div class="expense-tracker">
    <div class="expense-header">
      <div class="expense-summary">
        <div class="summary-card">
          <div class="sum-label">总花费</div>
          <div class="sum-value total">¥ {{ total.toFixed(2) }}</div>
        </div>
        <div class="summary-card small">
          <div class="sum-label">记录数</div>
          <div class="sum-value">{{ expenses.length }}</div>
        </div>
      </div>
      <a-button type="primary" size="small" :icon="iconPlus" @click="openForm()">新增花费</a-button>
    </div>

    <div class="category-chart" v-if="summary.length">
      <div v-for="s in summary" :key="s.category" class="cat-item">
        <div class="cat-head">
          <span class="cat-name">{{ categoryNames[s.category] || s.category }}</span>
          <span class="cat-amount">¥ {{ s.total.toFixed(2) }}</span>
        </div>
        <div class="cat-bar">
          <div
            class="cat-fill"
            :style="{ width: (s.total / total * 100) + '%', background: categoryColors[s.category] || '#ccc' }"
          ></div>
        </div>
        <div class="cat-sub">{{ s.count }} 笔 · {{ ((s.total / total) * 100).toFixed(1) }}%</div>
      </div>
    </div>

    <a-divider />

    <a-table
      :data="expenses"
      :pagination="false"
      :row-key="'id'"
      size="small"
    >
      <template #columns>
        <a-table-column title="日期" data-index="expense_date" :width="120">
          <template #cell="{ record }">
            {{ formatDate(record.expense_date || record.created_at) }}
          </template>
        </a-table-column>
        <a-table-column title="类别" data-index="category" :width="140">
          <template #cell="{ record }">
            <a-tag :color="getCategoryColor(record.category)">
              {{ categoryNames[record.category] || record.category }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="金额" data-index="amount" :width="120">
          <template #cell="{ record }">
            <span class="amount-cell">¥ {{ Number(record.amount).toFixed(2) }}</span>
          </template>
        </a-table-column>
        <a-table-column title="备注" data-index="description">
          <template #cell="{ record }">{{ record.description || '-' }}</template>
        </a-table-column>
        <a-table-column title="操作" :width="100" align="right">
          <template #cell="{ record }">
            <a-button type="text" size="mini" @click="openForm(record)">编辑</a-button>
            <a-popconfirm content="删除此记录？" position="br" @ok="remove(record.id)">
              <a-button type="text" size="mini" status="danger">删除</a-button>
            </a-popconfirm>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <a-empty v-if="!expenses.length" description="暂无花费记录" :style="{ padding: '30px 0' }" />

    <a-modal
      v-model:visible="formVisible"
      :title="editing ? '编辑花费' : '新增花费'"
      width="440px"
      @ok="save"
      @cancel="formVisible = false"
      unmount-on-close
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="金额 (¥)" required>
          <a-input-number v-model="form.amount" :min="0" :step="1" style="width: 100%" placeholder="请输入金额" />
        </a-form-item>
        <a-form-item label="类别">
          <a-select v-model="form.category" style="width: 100%">
            <a-option v-for="(name, key) in categoryNames" :key="key" :value="key">{{ name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="日期">
          <a-date-picker v-model="form.expense_date" value-format="YYYY-MM-DD" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model="form.description" :auto-size="{ minRows: 2, maxRows: 4 }" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconPlus } from '@arco-design/web-vue/es/icon'
import { formatDate } from '@/utils'

const props = defineProps({
  travelId: { type: [Number, String], required: true }
})

const emit = defineEmits(['change'])

const api = window.electronAPI || {}
const iconPlus = IconPlus

const categoryNames = {
  transport: '交通',
  accommodation: '住宿',
  food: '餐饮',
  ticket: '门票',
  shopping: '购物',
  entertainment: '娱乐',
  other: '其他'
}

const categoryColors = {
  transport: '#7eb8da',
  accommodation: '#c4a77d',
  food: '#e8a5b9',
  ticket: '#8bc9a0',
  shopping: '#b59ad6',
  entertainment: '#f2d59e',
  other: '#b0b0b0'
}

const getCategoryColor = (c) => {
  const map = {
    transport: 'blue', accommodation: 'orange', food: 'pink',
    ticket: 'green', shopping: 'purple', entertainment: 'yellow', other: 'gray'
  }
  return map[c] || 'gray'
}

const expenses = ref([])
const summary = ref([])
const formVisible = ref(false)
const editing = ref(null)

const form = reactive({
  amount: 0,
  category: 'food',
  expense_date: formatDate(new Date()),
  description: ''
})

const total = computed(() => expenses.value.reduce((s, e) => s + Number(e.amount || 0), 0))

const load = async () => {
  expenses.value = await api.expense.list(props.travelId)
  summary.value = await api.expense.summary(props.travelId)
  emit('change')
}

const openForm = (record) => {
  editing.value = record
  if (record) {
    Object.assign(form, {
      amount: record.amount,
      category: record.category,
      expense_date: record.expense_date || formatDate(new Date()),
      description: record.description || ''
    })
  } else {
    Object.assign(form, {
      amount: 0,
      category: 'food',
      expense_date: formatDate(new Date()),
      description: ''
    })
  }
  formVisible.value = true
}

const save = async () => {
  if (!form.amount || form.amount <= 0) {
    Message.warning('请输入有效金额')
    return
  }
  try {
    if (editing.value) {
      await api.expense.update(editing.value.id, { ...form })
      Message.success('已更新')
    } else {
      await api.expense.create({ travel_id: props.travelId, ...form })
      Message.success('已添加')
    }
    formVisible.value = false
    await load()
  } catch (e) {
    Message.error('操作失败')
  }
}

const remove = async (id) => {
  await api.expense.delete(id)
  Message.success('已删除')
  await load()
}

watch(() => props.travelId, load, { immediate: true })
</script>

<style lang="less" scoped>
.expense-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.expense-summary {
  display: flex;
  gap: 12px;
  flex: 1;
}

.summary-card {
  background: linear-gradient(135deg, #e3f2f9, #d4ebf7);
  border-radius: 12px;
  padding: 14px 20px;
  min-width: 160px;

  &.small {
    background: linear-gradient(135deg, #f5efe0, #efe5d0);
    min-width: 120px;
  }
}

.sum-label {
  font-size: 11px;
  color: #8a8a8a;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.sum-value {
  font-size: 22px;
  font-weight: 700;
  color: #5a9fc4;
  font-family: 'Segoe UI', sans-serif;

  &.total {
    font-size: 26px;
  }
}

.category-chart {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
  margin-bottom: 8px;
}

.cat-item {
  .cat-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
  }
  .cat-name {
    color: #4a4a4a;
    font-weight: 500;
  }
  .cat-amount {
    color: #a88a5c;
    font-weight: 600;
  }
  .cat-bar {
    height: 6px;
    background: #f0ebe3;
    border-radius: 3px;
    overflow: hidden;
  }
  .cat-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .cat-sub {
    font-size: 10px;
    color: #b0b0b0;
    margin-top: 3px;
  }
}

.amount-cell {
  color: #c0392b;
  font-weight: 600;
}
</style>
