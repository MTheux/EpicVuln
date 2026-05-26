# -*- coding: utf-8 -*-
"""
AISEC Burp Extension — Bridge Burp Suite ↔ AISEC (Caixa/Unisys).

Carrega no Burp Suite via Extender → Add → Extension type: Python → file:
AisecBurpExtension.py (requer Jython 2.7+ standalone configurado em Extender → Options).

Features
========
1. Aba dedicada "AISEC" com config:
   - URL da plataforma AISEC (default http://localhost:9001)
   - JWT Bearer token (copiável da sessão da plataforma)
   - Status da conexão (testar)
2. Context menu "Send selected to AISEC" no Proxy History / Repeater / Target / Site Map
   → envia os items selecionados pra AISEC via POST JSON
3. Botão na aba "Export ALL proxy history to AISEC"
4. Output panel mostrando logs da extensão
5. Funciona offline: salva JSON .aisec.json no /tmp se a API tiver indisponível

Compliance Unisys AI P1.0
=========================
- Extensão NÃO executa ataques — apenas exporta histórico que o pentester já capturou.
- Output rotulado "Content Created By/With Use of AI" no upstream AISEC.
- Configuração de token fica em memória durante a sessão Burp; não persiste no Burp Project File.

Autor: Unisys AppSec Squad / AISEC platform
Licença: uso interno Caixa Econômica Federal
"""

from burp import (
    IBurpExtender,
    IContextMenuFactory,
    ITab,
    IHttpRequestResponse,
)

from javax.swing import (
    JPanel, JLabel, JTextField, JPasswordField, JButton, JTextArea,
    JScrollPane, BoxLayout, JMenuItem, BorderFactory, JSeparator,
    SwingConstants, SwingUtilities, JCheckBox,
)
from java.awt import GridBagLayout, GridBagConstraints, Insets, Dimension, Color, Font
from java.awt.event import ActionListener
from java.net import URL
from java.io import OutputStreamWriter, BufferedReader, InputStreamReader
from java.util import ArrayList

import json
import base64
import re
import threading
import datetime


VERSION = "1.0.0"
DEFAULT_URL = "http://localhost:9001"
BANNER = "AISEC Burp Bridge v" + VERSION


class BurpExtender(IBurpExtender, IContextMenuFactory, ITab):
    # ------------------------------------------------------------------
    # IBurpExtender
    # ------------------------------------------------------------------
    def registerExtenderCallbacks(self, callbacks):
        self._callbacks = callbacks
        self._helpers = callbacks.getHelpers()
        callbacks.setExtensionName("AISEC Burp Bridge")

        # ----- UI principal -----
        self._main_panel = JPanel(GridBagLayout())
        self._main_panel.setBorder(BorderFactory.createEmptyBorder(12, 12, 12, 12))
        gbc = GridBagConstraints()
        gbc.fill = GridBagConstraints.HORIZONTAL
        gbc.insets = Insets(4, 4, 4, 4)
        gbc.gridx = 0
        gbc.gridy = 0
        gbc.weightx = 0

        # Header
        header = JLabel("AISEC Burp Bridge")
        header.setFont(Font("SansSerif", Font.BOLD, 16))
        header.setForeground(Color(16, 185, 129))  # emerald-500
        gbc.gridwidth = 2
        self._main_panel.add(header, gbc)
        gbc.gridy += 1
        sub = JLabel("Exporta history do Burp para a plataforma AISEC (Caixa/Unisys).")
        sub.setForeground(Color.GRAY)
        self._main_panel.add(sub, gbc)
        gbc.gridy += 1
        sep1 = JSeparator()
        sep1.setPreferredSize(Dimension(400, 1))
        gbc.fill = GridBagConstraints.HORIZONTAL
        self._main_panel.add(sep1, gbc)
        gbc.gridy += 1
        gbc.gridwidth = 1

        # AISEC URL
        self._main_panel.add(JLabel("URL da plataforma AISEC:"), gbc)
        gbc.gridx = 1
        gbc.weightx = 1
        self.url_field = JTextField(DEFAULT_URL, 30)
        self._main_panel.add(self.url_field, gbc)
        gbc.gridy += 1
        gbc.gridx = 0
        gbc.weightx = 0

        # JWT Bearer
        self._main_panel.add(JLabel("JWT / Bearer token:"), gbc)
        gbc.gridx = 1
        gbc.weightx = 1
        self.token_field = JPasswordField("", 30)
        self.token_field.setToolTipText(
            "Cole o token JWT da sessão AISEC. Pegue no DevTools > Application > Cookies > epicvuln_token."
        )
        self._main_panel.add(self.token_field, gbc)
        gbc.gridy += 1
        gbc.gridx = 0
        gbc.weightx = 0

        # Opções
        self.include_response_chk = JCheckBox("Incluir corpo das responses (mais pesado)")
        self.include_response_chk.setSelected(False)
        gbc.gridwidth = 2
        self._main_panel.add(self.include_response_chk, gbc)
        gbc.gridy += 1
        self.fallback_file_chk = JCheckBox(
            "Salvar JSON em /tmp/aisec-burp.json caso o upload falhe (fallback)"
        )
        self.fallback_file_chk.setSelected(True)
        self._main_panel.add(self.fallback_file_chk, gbc)
        gbc.gridy += 1
        gbc.gridwidth = 1

        # Buttons row
        gbc.gridwidth = 2
        gbc.fill = GridBagConstraints.NONE
        gbc.anchor = GridBagConstraints.WEST
        buttons_panel = JPanel()
        self.test_btn = JButton("Testar conexão", actionPerformed=self._on_test)
        self.export_all_btn = JButton(
            "Exportar TODO o proxy history → AISEC",
            actionPerformed=self._on_export_all,
        )
        self.clear_log_btn = JButton("Limpar log", actionPerformed=self._on_clear_log)
        buttons_panel.add(self.test_btn)
        buttons_panel.add(self.export_all_btn)
        buttons_panel.add(self.clear_log_btn)
        self._main_panel.add(buttons_panel, gbc)
        gbc.gridy += 1
        gbc.fill = GridBagConstraints.HORIZONTAL

        # Log panel
        log_label = JLabel("Log")
        log_label.setFont(Font("SansSerif", Font.BOLD, 12))
        self._main_panel.add(log_label, gbc)
        gbc.gridy += 1
        gbc.fill = GridBagConstraints.BOTH
        gbc.weighty = 1
        self.log_area = JTextArea(16, 60)
        self.log_area.setEditable(False)
        self.log_area.setFont(Font("Monospaced", Font.PLAIN, 11))
        self.log_area.setBackground(Color(20, 20, 20))
        self.log_area.setForeground(Color(220, 220, 220))
        scroll = JScrollPane(self.log_area)
        self._main_panel.add(scroll, gbc)

        # Register tab + context menu + provider
        callbacks.addSuiteTab(self)
        callbacks.registerContextMenuFactory(self)

        self._log(BANNER + " carregada com sucesso.")
        self._log("Configure a URL + token na aba 'AISEC' e use o menu de contexto.")
        print(BANNER + " loaded.")

    # ------------------------------------------------------------------
    # ITab
    # ------------------------------------------------------------------
    def getTabCaption(self):
        return "AISEC"

    def getUiComponent(self):
        return self._main_panel

    # ------------------------------------------------------------------
    # IContextMenuFactory — adiciona "Send selected to AISEC" no menu
    # ------------------------------------------------------------------
    def createMenuItems(self, invocation):
        messages = invocation.getSelectedMessages()
        if not messages or len(messages) == 0:
            return None
        menu = ArrayList()
        item = JMenuItem(
            "Send %d selected to AISEC" % len(messages),
            actionPerformed=lambda evt, m=messages: self._on_send_selected(m),
        )
        menu.add(item)
        return menu

    # ------------------------------------------------------------------
    # Ações
    # ------------------------------------------------------------------
    def _on_test(self, evt):
        url = self.url_field.getText().strip()
        token = self._get_token()
        if not url:
            self._log("[!] URL vazia.")
            return
        try:
            response = self._http_get(url + "/health", token)
            self._log("[test] %s/health → %s" % (url, response[:200]))
        except Exception as e:
            self._log("[test] erro: %s" % str(e))

    def _on_send_selected(self, messages):
        threading.Thread(target=self._send_thread, args=(list(messages),)).start()

    def _on_export_all(self, evt):
        try:
            history = self._callbacks.getProxyHistory()
            if not history:
                self._log("[!] Proxy history vazio.")
                return
            self._log("[export-all] %d requests no proxy history" % len(history))
            threading.Thread(target=self._send_thread, args=(list(history),)).start()
        except Exception as e:
            self._log("[export-all] erro: %s" % str(e))

    def _on_clear_log(self, evt):
        self.log_area.setText("")

    # ------------------------------------------------------------------
    # Worker thread — converte items pra JSON e POST pra AISEC
    # ------------------------------------------------------------------
    def _send_thread(self, messages):
        try:
            url = self.url_field.getText().strip().rstrip("/")
            token = self._get_token()
            include_resp = self.include_response_chk.isSelected()
            fallback = self.fallback_file_chk.isSelected()

            self._log("[send] convertendo %d items..." % len(messages))
            items = []
            for msg in messages:
                try:
                    items.append(self._convert_message(msg, include_resp))
                except Exception as e:
                    self._log("[send] skip item: %s" % str(e))

            payload = {
                "source": "burp-extension",
                "version": VERSION,
                "exportedAt": datetime.datetime.utcnow().isoformat() + "Z",
                "requests": items,
            }
            payload_str = json.dumps(payload)
            self._log("[send] payload pronto: %d items, %d bytes" % (len(items), len(payload_str)))

            if not token:
                self._log("[!] Sem token JWT — salvando localmente como fallback.")
                self._save_fallback(payload_str)
                return

            endpoint = url + "/api/integrations/burp/import"
            try:
                resp = self._http_post(endpoint, payload_str, token)
                self._log("[send] POST %s → %s" % (endpoint, resp[:300]))
            except Exception as e:
                self._log("[send] falha HTTP: %s" % str(e))
                if fallback:
                    self._save_fallback(payload_str)
                    self._log("[send] fallback salvo. Suba manualmente no Burp Zekrom (/pentest/unisystem).")
        except Exception as e:
            self._log("[send] erro inesperado: %s" % str(e))

    def _convert_message(self, msg, include_resp):
        """Converte IHttpRequestResponse em dict normalizado pro upload AISEC."""
        http_service = msg.getHttpService()
        host = http_service.getHost()
        port = http_service.getPort()
        protocol = http_service.getProtocol()

        req_bytes = msg.getRequest()
        req_info = self._helpers.analyzeRequest(http_service, req_bytes)
        url = str(req_info.getUrl())
        method = req_info.getMethod()
        headers = list(req_info.getHeaders())
        body_offset = req_info.getBodyOffset()
        body = ""
        if req_bytes and body_offset and len(req_bytes) > body_offset:
            try:
                body = self._helpers.bytesToString(req_bytes[body_offset:])
            except Exception:
                body = base64.b64encode(req_bytes[body_offset:].tostring())

        # Headers como dict (pula primeira linha que é VERB / HTTP)
        header_map = {}
        for h in headers[1:]:
            if ":" in h:
                k, v = h.split(":", 1)
                header_map[k.strip()] = v.strip()

        # Parse query params
        query_str = ""
        path_only = url
        if "?" in url:
            path_only, query_str = url.split("?", 1)
        param_names = []
        param_values = []
        if query_str:
            for pair in query_str.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    try:
                        param_names.append(k)
                        param_values.append(self._url_decode(v))
                    except Exception:
                        param_names.append(k)
                        param_values.append(v)

        # Body params (form-urlencoded)
        if body and "application/x-www-form-urlencoded" in header_map.get("Content-Type", "").lower():
            for pair in body.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    param_names.append(k)
                    try:
                        param_values.append(self._url_decode(v))
                    except Exception:
                        param_values.append(v)

        # Body JSON keys
        if body and "application/json" in header_map.get("Content-Type", "").lower():
            try:
                data = json.loads(body)
                if isinstance(data, dict):
                    for k, v in data.items():
                        param_names.append(k)
                        param_values.append(str(v))
            except Exception:
                pass

        item = {
            "method": method,
            "url": url,
            "host": host,
            "port": port,
            "protocol": protocol,
            "paramNames": param_names,
            "paramValues": param_values,
            "headers": header_map,
            "body": body[:2000],  # capped
        }

        # Response
        resp_bytes = msg.getResponse()
        if resp_bytes:
            resp_info = self._helpers.analyzeResponse(resp_bytes)
            item["status"] = resp_info.getStatusCode()
            item["responseLen"] = len(resp_bytes)
            if include_resp:
                resp_body_offset = resp_info.getBodyOffset()
                try:
                    item["responseBody"] = self._helpers.bytesToString(resp_bytes[resp_body_offset:])[:4000]
                except Exception:
                    item["responseBody"] = "[binary]"
        return item

    # ------------------------------------------------------------------
    # HTTP helpers (Jython usa java.net)
    # ------------------------------------------------------------------
    def _http_get(self, url, token):
        conn = URL(url).openConnection()
        conn.setRequestMethod("GET")
        if token:
            conn.setRequestProperty("Authorization", "Bearer " + token)
            conn.setRequestProperty("Cookie", "epicvuln_token=" + token)
        conn.setConnectTimeout(5000)
        conn.setReadTimeout(10000)
        code = conn.getResponseCode()
        stream = conn.getInputStream() if code < 400 else conn.getErrorStream()
        reader = BufferedReader(InputStreamReader(stream))
        body_lines = []
        line = reader.readLine()
        while line is not None:
            body_lines.append(line)
            line = reader.readLine()
        reader.close()
        return "HTTP %d · %s" % (code, "".join(body_lines)[:500])

    def _http_post(self, url, body, token):
        conn = URL(url).openConnection()
        conn.setRequestMethod("POST")
        conn.setDoOutput(True)
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        if token:
            conn.setRequestProperty("Authorization", "Bearer " + token)
            conn.setRequestProperty("Cookie", "epicvuln_token=" + token)
        conn.setConnectTimeout(8000)
        conn.setReadTimeout(60000)
        out = OutputStreamWriter(conn.getOutputStream(), "UTF-8")
        out.write(body)
        out.flush()
        out.close()
        code = conn.getResponseCode()
        stream = conn.getInputStream() if code < 400 else conn.getErrorStream()
        reader = BufferedReader(InputStreamReader(stream))
        lines = []
        line = reader.readLine()
        while line is not None:
            lines.append(line)
            line = reader.readLine()
        reader.close()
        return "HTTP %d · %s" % (code, "".join(lines)[:500])

    def _save_fallback(self, payload_str):
        import os
        path = "/tmp/aisec-burp-%s.json" % datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        try:
            f = open(path, "w")
            f.write(payload_str)
            f.close()
            self._log("[fallback] salvo em %s" % path)
        except Exception as e:
            self._log("[fallback] falha ao salvar: %s" % str(e))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get_token(self):
        return "".join(self.token_field.getPassword()).strip()

    def _url_decode(self, s):
        try:
            return s.replace("+", " ").decode("utf-8") if isinstance(s, bytes) else s
        except Exception:
            return s

    def _log(self, msg):
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        line = "[%s] %s\n" % (ts, msg)
        def _append():
            self.log_area.append(line)
            self.log_area.setCaretPosition(self.log_area.getDocument().getLength())
        SwingUtilities.invokeLater(_append)
