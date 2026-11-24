import { useState, useEffect, useRef, useCallback } from "react";
import * as Vue from "vue";
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyle,
} from "@vue/compiler-sfc";

const DEFAULT_VUE_CODE = `<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<template>
  <div class="box">
    <h2>Vue 3 실시간 샌드박스</h2>
    <p>카운트: <strong>{{ count }}</strong> (2배: {{ doubled }})</p>
    <button @click="count++">+1 증가</button>
    <button @click="count = 0">초기화</button>
  </div>
</template>

<style scoped>
.box {
  padding: 20px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-family: sans-serif;
}
button {
  margin-right: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: #42b883;
  color: white;
  font-weight: bold;
  cursor: pointer;
}
button:hover {
  background: #33a06f;
}
</style>`;

function rewriteVueImports(jsCode) {
  return jsCode
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*['"]vue['"]\s*;?/g,
      (_, imports) => {
        const mapped = imports
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            if (s.includes(" as ")) {
              const [orig, alias] = s.split(/\s+as\s+/).map((x) => x.trim());
              return `${orig}: ${alias}`;
            }
            return s;
          })
          .join(", ");
        return `const { ${mapped} } = Vue;`;
      }
    )
    .replace(
      /import\s+\*\s+as\s+(\w+)\s+from\s*['"]vue['"]\s*;?/g,
      "const $1 = Vue;"
    );
}

export default function VueSandbox({ code, onChangeCode, onResetCode }) {
  const [isEditorHidden, setIsEditorHidden] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const previewMountRef = useRef(null);
  const styleMountRef = useRef(null);
  const vueAppRef = useRef(null);
  const textareaRef = useRef(null);

  const runVueCode = useCallback((sourceCode) => {
    setErrorMsg("");

    // 이전 Vue 앱 언마운트
    if (vueAppRef.current) {
      try {
        vueAppRef.current.unmount();
      } catch {
        // ignore unmount errors
      }
      vueAppRef.current = null;
    }

    if (previewMountRef.current) {
      previewMountRef.current.innerHTML = "";
    }
    if (styleMountRef.current) {
      styleMountRef.current.innerHTML = "";
    }

    try {
      const scopeId = "data-v-" + Math.random().toString(36).slice(2, 8);
      const { descriptor, errors } = parse(sourceCode, {
        filename: "Sandbox.vue",
      });

      if (errors && errors.length > 0) {
        setErrorMsg(errors.map((e) => e.message || String(e)).join("\n"));
        return;
      }

      let componentDef = {};

      if (descriptor.script || descriptor.scriptSetup) {
        const compiled = compileScript(descriptor, {
          id: scopeId,
          inlineTemplate: true,
        });
        let js = rewriteVueImports(compiled.content);
        js = js.replace(/export\s+default\s+/, "return ");
        const factory = new Function("Vue", js);
        componentDef = factory(Vue);
      } else if (descriptor.template) {
        const compiledTpl = compileTemplate({
          source: descriptor.template.content,
          filename: "Sandbox.vue",
          id: scopeId,
        });
        if (compiledTpl.errors && compiledTpl.errors.length > 0) {
          setErrorMsg(
            compiledTpl.errors.map((e) => e.message || String(e)).join("\n")
          );
          return;
        }
        let js = rewriteVueImports(compiledTpl.code);
        js = js.replace(/export\s+function\s+render/, "function render");
        js += "\nreturn { render };";
        const factory = new Function("Vue", js);
        componentDef = factory(Vue);
      } else {
        setErrorMsg("<template> 또는 <script setup> 블록이 필요합니다.");
        return;
      }

      // 스타일 처리
      if (descriptor.styles && descriptor.styles.length > 0) {
        const hasScoped = descriptor.styles.some((s) => s.scoped);
        if (hasScoped) {
          componentDef.__scopeId = scopeId;
        }
        descriptor.styles.forEach((styleBlock) => {
          const compiledStyle = compileStyle({
            source: styleBlock.content,
            filename: "Sandbox.vue",
            id: scopeId,
            scoped: styleBlock.scoped,
          });
          if (compiledStyle.errors && compiledStyle.errors.length > 0) {
            setErrorMsg(compiledStyle.errors.join("\n"));
          } else if (styleMountRef.current) {
            const styleEl = document.createElement("style");
            styleEl.textContent = compiledStyle.code;
            styleMountRef.current.appendChild(styleEl);
          }
        });
      }

      const app = Vue.createApp(componentDef);
      app.config.errorHandler = (err) => {
        setErrorMsg(err?.message ? `Runtime Error: ${err.message}` : String(err));
      };
      app.mount(previewMountRef.current);
      vueAppRef.current = app;
    } catch (err) {
      setErrorMsg(err?.message || String(err));
    }
  }, []);

  // 초기 마운트 및 언마운트 정리
  useEffect(() => {
    runVueCode(code || DEFAULT_VUE_CODE);
    return () => {
      if (vueAppRef.current) {
        try {
          vueAppRef.current.unmount();
        } catch {
          // ignore
        }
      }
    };
  }, [code, runVueCode]);

  const handleKeyDown = (e) => {
    // Ctrl+Enter 또는 Cmd+Enter로 실행
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runVueCode(code);
      return;
    }

    // Tab 키 2칸 들여쓰기 지원
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextValue = code.substring(0, start) + "  " + code.substring(end);
      onChangeCode(nextValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="vue-sandbox">
      {!isEditorHidden && (
        <div className="sandbox-editor-pane">
          <textarea
            ref={textareaRef}
            className="sandbox-textarea"
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="<script setup> 과 <template> 을 작성하세요..."
          />
        </div>
      )}

      <div className="sandbox-toolbar">
        <div className="sandbox-toolbar-left">
          <button
            type="button"
            className="sandbox-btn sandbox-btn-run"
            onClick={() => runVueCode(code)}
          >
            ▶ 실행 (Ctrl+Enter)
          </button>
          <button
            type="button"
            className="sandbox-btn sandbox-btn-reset"
            onClick={onResetCode}
          >
            ↺ 코드 초기화
          </button>
        </div>
        <button
          type="button"
          className="sandbox-btn sandbox-btn-toggle"
          onClick={() => setIsEditorHidden((prev) => !prev)}
        >
          {isEditorHidden ? "👁️ 에디터 보이기" : "🙈 에디터 숨기기"}
        </button>
      </div>

      <div
        className={`sandbox-preview-pane ${
          isEditorHidden ? "full-height" : ""
        }`}
      >
        <div ref={styleMountRef} />
        <div ref={previewMountRef} className="sandbox-preview-mount" />
        {errorMsg && (
          <div className="sandbox-console-error">
            <div className="sandbox-console-title">⚠️ Console Error</div>
            <pre>{errorMsg}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_VUE_CODE };
