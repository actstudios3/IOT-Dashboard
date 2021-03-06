<template>
  <b-tabs pills card end class="iot-d-flex-grow">
    <b-tab @contextmenu="onRightClick" no-body :title="commList[t]" v-for="(t, i) in tabs" :key="`console${t}`">
      <b-container fluid class="iot-d-flex-grid">
        <b-row class="flex-grow-1">
          <b-col class="iot-d-flex-grid p-0">
            <iot-terminal
              :pid="i"
              class="iot-d-flex-grow"
              :containerID="'terminal' + i" 
              :id="'terminal' + i"
              :eventHub="terminalEventHub" />
          </b-col>
          <b-col cols="3" class="iot-d-flex">
            <b-row class="h-50">
              <b-card no-body class="flex-grow-1" style="overflow: auto;">
                <b-card-header class="text-center">历史命令</b-card-header>
                <b-list-group>
                  <b-list-group-item href="#"
                    @click="onHistoryClick(i, j)"
                    @dblclick="onHistoryDblClick(i)"
                    v-for="(c, j) in terminals[i].history"
                    :key="`${c}-${i}-${j}`">{{c}}</b-list-group-item>
                </b-list-group>
              </b-card>
            </b-row>
            <b-row>
              <b-card no-body class="flex-grow-1">
                <b-card-header class="text-center">脚本</b-card-header>
                <div class="m-2 iot-d-flex">
                  <b-form-select v-model="scriptSelected" :options="scripts" class="mb-2" />
                  <b-button-group size="sm">
                    <b-btn class="flex-grow-1" variant="primary" @click="onRunScript">运行</b-btn>
                    <b-btn class="flex-grow-1" variant="warning" @click="onStopScript">停止</b-btn>
                    <b-btn class="" @click="onEditScript" v-b-modal.codeEditorModal>编辑</b-btn>
                    <b-btn class="" @click="onAddScript" v-b-modal.codeEditorModal>添加</b-btn>
                    <b-btn variant="danger" @click="onDeleteScript">删除</b-btn>
                  </b-button-group>
                </div>
                <b-card-footer class="text-center">脚本运行结果</b-card-footer>
				        <iot-mini-terminal class="d-flex"
                  :containerID="'scriptTerminal' + i"
                  :id="'scriptTerminal' + i"
                  :eventHub="scriptEventHub"/>
              </b-card>
            </b-row>
          </b-col>
        </b-row>
      </b-container>
      <div style="position: relative;">
        <b-btn size="sm" variant="danger" class="iot-close-btn" @click="()=>closeTab(i)">
          x
        </b-btn>
      </div>
    </b-tab>
    <b-nav-item slot="tabs" v-b-modal.commConfigModal href="#">
      +
    </b-nav-item>
    <iot-comm-config modalID="commConfigModal"></iot-comm-config>
    <iot-code-editor modalID="codeEditorModal"
      :eventHub="editScriptEventHub" />
    <!-- Render this if no tabs -->
    <div slot="empty" style="margin: auto" class="h-100 text-center text-muted">
      没有打开的终端
      <br> 点击下方+按钮创建一个新的终端
    </div>
  </b-tabs>
</template>

<script>
  import Terminal from '@components/ConsolePage/Terminal'
  import ScriptTerminal from '@components/ConsolePage/ScriptTerminal'
  import CommConfigModal from '@components/ConsolePage/CommConfigModal'
  import CodeEditorModal from '@components/ConsolePage/CodeEditorModal'
  import {mapState} from 'vuex'
  import {ipcRenderer} from 'electron'
  import fs from 'fs'
  import path from 'path'
  import Vue from 'vue'
  import constant from '@utils/Constant'
  import scripts from '@utils/Scripts'

  export default {
    name: 'consolePage',
    data () {
      return {
        tabCounter: 0,
        scripts: [],
        scriptSelected: null,
        terminalEventHub: new Vue(),
        scriptEventHub: new Vue(),
        editScriptEventHub: new Vue()
      }
    },
    computed: {
      ...mapState({
        terminals: state => state.terminal.terminals,
        commList: state => state.terminal.commList,
        tabs: state => state.terminal.tabs
      })
    },
    watch: {
      scriptSelected (value) {
        this.editScriptEventHub.$emit(constant.EVENT_UPDATE_SCRIPT, value + '.js')
      }
    },
    mounted () {
      this.editScriptEventHub.$on(constant.EVENT_REFRESH_SCRIPT, value => {
        this.scriptSelected = path.basename(value)
        this.updateScriptList()
      })
      this.updateScriptList()

      ipcRenderer.on(constant.EVENT_ASYNC_REPLY, (event, value) => {
        if (value.event) {
          let {event, data} = value
          switch (event) {
            case constant.EVENT_PRINT_TERMINAL:
              this.terminalEventHub.$emit(constant.EVENT_TERMINAL_OUTPUT, data)
              break
            case constant.EVENT_PRINT_LOG:
              this.scriptEventHub.$emit(constant.EVENT_TERMINAL_OUTPUT, data)
              break
            case constant.EVENT_LISTEN_KEYWORD:
            case constant.EVENT_LISTEN_CLEANUP:
              this.terminalEventHub.$emit(event, data)
              break
          }
        }
      })

      this.scriptEventHub.$on(constant.EVENT_TERMINAL_INPUT, console.log)
      this.terminalEventHub.$on(constant.EVENT_TERMINAL_INPUT, console.log)
      this.terminalEventHub.$on(constant.EVENT_LISTEN_KEYWORD_RESULT, d => {
        ipcRenderer.send(constant.EVENT_ASYNC_MSG, {
          event: constant.EVENT_LISTEN_KEYWORD_RESULT,
          data: d
        })
      })
    },
    methods: {
      updateScriptList () {
        this.scripts = scripts.getScripts()
      },
      closeTab (i) {
        this.$store.commit('DEL_TAB', i)
        this.$store.commit('DEL_TERMINAL', i)
      },
      onHistoryClick (pid, cmdIdx) {
        this.$store.commit('SHOW_HISTORY_COMMAND', {pid: pid, cmdIdx: cmdIdx})
      },
      onHistoryDblClick (pid) {
        this.$store.commit('ISSUE_HISTORY_COMMAND', pid)
      },
      onRightClick (e) {
        console.log(e)
      },
      onRunScript (e) {
        if (!this.scriptSelected) return
        ipcRenderer.send(constant.EVENT_ASYNC_MSG, {
          event: constant.EVENT_RUN_SCRIPT,
          data: this.scriptSelected
        })
      },
      onStopScript (e) {
        if (!this.scriptSelected) return
        ipcRenderer.send(constant.EVENT_ASYNC_MSG, {
          event: constant.EVENT_STOP_SCRIPT,
          data: this.scriptSelected
        })
      },
      onEditScript (e) {
        // console.log(123)
        this.editScriptEventHub.$emit(constant.EVENT_EDIT_SCRIPT)
      },
      onAddScript (e) {
        this.editScriptEventHub.$emit(constant.EVENT_NEW_SCRIPT)
      },
      onDeleteScript (e) {
        let scriptPath = scripts.getScriptFilePath(this.scriptSelected)
        if (fs.existsSync(scriptPath)) {
          fs.unlink(scriptPath, err => {
            if (err) throw err
            this.updateScriptList()
          })
        }
      }
    },
    components: {
      'iot-terminal': Terminal,
      'iot-mini-terminal': ScriptTerminal,
      'iot-comm-config': CommConfigModal,
      'iot-code-editor': CodeEditorModal
    }
  }
</script>

<style>
</style>
