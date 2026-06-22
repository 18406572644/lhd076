<template>
  <a-card class="stat-card" :style="cardStyle">
    <div class="stat-content">
      <div class="stat-icon" :style="iconStyle">
        <component :is="icon" />
      </div>
      <div class="stat-info">
        <div class="stat-value">{{ displayValue }}</div>
        <div class="stat-label">{{ label }}</div>
      </div>
    </div>
    <div v-if="subLabel" class="stat-sub">
      {{ subLabel }}
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  value: [String, Number],
  icon: Object,
  color: {
    type: String,
    default: 'blue'
  },
  subLabel: String
})

const colorMap = {
  blue: { bg: 'linear-gradient(135deg, #e3f2f9, #d4ebf7)', icon: '#7eb8da', text: '#5a9fc4' },
  brown: { bg: 'linear-gradient(135deg, #f5efe0, #efe5d0)', icon: '#c4a77d', text: '#a88a5c' },
  green: { bg: 'linear-gradient(135deg, #e4f4eb, #d2ecd9)', icon: '#8bc9a0', text: '#6ab384' },
  pink: { bg: 'linear-gradient(135deg, #fbe8ee, #f6d6e0)', icon: '#e8a5b9', text: '#d1879f' },
  yellow: { bg: 'linear-gradient(135deg, #fdf3df, #fbe9c2)', icon: '#e8c46e', text: '#c9a24e' },
  purple: { bg: 'linear-gradient(135deg, #f0e8f7, #e5d6f0)', icon: '#b59ad6', text: '#9a7fc0' }
}

const safeStyle = computed(() => colorMap[props.color] || colorMap.blue)
const cardStyle = computed(() => ({ background: safeStyle.value?.bg || colorMap.blue.bg }))
const iconStyle = computed(() => ({ background: safeStyle.value?.icon || colorMap.blue.icon, color: '#fff' }))
const textColor = computed(() => safeStyle.value?.text || colorMap.blue.text)
const displayValue = computed(() => {
  if (typeof props.value === 'number' && props.value >= 10000) {
    return (props.value / 10000).toFixed(1) + 'w'
  }
  return props.value ?? 0
})
</script>

<style lang="less" scoped>
.stat-card {
  border: none !important;
  border-radius: 16px !important;
  padding: 8px 0;

  :deep(.arco-card-body) {
    padding: 16px 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: v-bind('textColor');
  font-family: 'Segoe UI', sans-serif;
}

.stat-label {
  font-size: 12px;
  color: #8a8a8a;
  margin-top: 4px;
}

.stat-sub {
  margin-top: 10px;
  font-size: 11px;
  color: #b0b0b0;
  padding-top: 10px;
  border-top: 1px dashed rgba(0,0,0,0.06);
}
</style>
