<template>
  <a-config-provider :locale="locale" :component-config="componentConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'

const locale = zhCN
const componentConfig = {
  Trigger: {
    autoFitPopupWidth: true
  }
}
</script>

<style lang="less">
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
