(() => {
  const STORAGE_KEY = "lugardo-todo-list:v1";
  const STATUSES = [
    { value: "pendiente", label: "Pendiente" },
    { value: "en-proceso", label: "En proceso" },
    { value: "completado", label: "Completado" },
    { value: "cancelado", label: "Cancelado" },
    { value: "pospuesto", label: "Pospuesto" },
  ];
  const STATUS_ORDER = STATUSES.map((s) => s.value);
  const MONTH_NAMES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  const state = {
    viewDate: startOfMonth(new Date()),
    selectedDate: null,
    filter: "all",
    tasks: loadTasks(),
    pendingMoveId: null,
  };

  const els = {
    calendarGrid: document.getElementById("calendarGrid"),
    monthLabel: document.getElementById("monthLabel"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),
    todayBtn: document.getElementById("todayBtn"),
    statusFilter: document.getElementById("statusFilter"),
    taskPanel: document.getElementById("taskPanel"),
    backdrop: document.getElementById("backdrop"),
    closePanel: document.getElementById("closePanel"),
    panelDate: document.getElementById("panelDate"),
    panelSummary: document.getElementById("panelSummary"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskBulkInput: document.getElementById("taskBulkInput"),
    taskTime: document.getElementById("taskTime"),
    micBtn: document.getElementById("micBtn"),
    micHint: document.getElementById("micHint"),
    modeToggle: document.getElementById("modeToggle"),
    taskList: document.getElementById("taskList"),
    emptyState: document.getElementById("emptyState"),
    moveModal: document.getElementById("moveModal"),
    moveDateInput: document.getElementById("moveDateInput"),
    moveTaskName: document.getElementById("moveTaskName"),
    cancelMove: document.getElementById("cancelMove"),
    confirmMove: document.getElementById("confirmMove"),
  };

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  }

  function getTasksForDate(key) {
    return state.tasks[key] || [];
  }

  function setTasksForDate(key, tasks) {
    if (!tasks || tasks.length === 0) {
      delete state.tasks[key];
    } else {
      state.tasks[key] = tasks;
    }
    saveTasks();
  }

  function filteredTasks(tasks) {
    if (state.filter === "all") return tasks;
    return tasks.filter((t) => t.status === state.filter);
  }

  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.createdAt - b.createdAt;
    });
  }

  function dominantStatuses(tasks) {
    const set = new Set(tasks.map((t) => t.status));
    return STATUS_ORDER.filter((s) => set.has(s));
  }

  function renderCalendar() {
    const year = state.viewDate.getFullYear();
    const month = state.viewDate.getMonth();
    const today = new Date();

    els.monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

    const firstOfMonth = new Date(year, month, 1);
    // Monday = 0, Sunday = 6
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    els.calendarGrid.innerHTML = "";
    const cells = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ date, otherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), otherMonth: false });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ date: next, otherMonth: next.getMonth() !== month });
      if (cells.length >= 42) break;
    }

    for (const { date, otherMonth } of cells) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      cell.setAttribute("role", "gridcell");
      if (otherMonth) cell.classList.add("other-month");
      if (isSameDay(date, today)) cell.classList.add("today");
      if (state.selectedDate && isSameDay(date, state.selectedDate)) {
        cell.classList.add("selected");
      }

      const key = formatDateKey(date);
      const tasks = filteredTasks(getTasksForDate(key));

      const num = document.createElement("span");
      num.className = "day-number";
      num.textContent = date.getDate();
      cell.appendChild(num);

      if (tasks.length > 0) {
        const count = document.createElement("span");
        count.className = "task-count";
        count.textContent = tasks.length;
        cell.appendChild(count);

        const dots = document.createElement("span");
        dots.className = "day-dots";
        for (const s of dominantStatuses(tasks)) {
          const dot = document.createElement("span");
          dot.className = `dot dot-${s}`;
          dots.appendChild(dot);
        }
        cell.appendChild(dots);
      }

      cell.addEventListener("click", () => {
        if (otherMonth) {
          state.viewDate = startOfMonth(date);
        }
        openPanel(date);
      });

      els.calendarGrid.appendChild(cell);
    }
  }

  function openPanel(date) {
    state.selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    renderCalendar();
    renderPanel();
    els.taskPanel.classList.add("open");
    els.taskPanel.setAttribute("aria-hidden", "false");
    els.backdrop.classList.add("visible");
    setTimeout(() => {
      (bulkMode ? els.taskBulkInput : els.taskInput).focus();
    }, 150);
  }

  function closePanel() {
    state.selectedDate = null;
    els.taskPanel.classList.remove("open");
    els.taskPanel.setAttribute("aria-hidden", "true");
    els.backdrop.classList.remove("visible");
    renderCalendar();
  }

  function renderPanel() {
    if (!state.selectedDate) return;
    const key = formatDateKey(state.selectedDate);
    const allTasks = getTasksForDate(key);
    const tasks = sortTasks(filteredTasks(allTasks));

    els.panelDate.textContent = formatLongDate(state.selectedDate);
    els.panelSummary.textContent = buildSummary(allTasks);

    els.taskList.innerHTML = "";

    if (tasks.length === 0) {
      els.emptyState.classList.add("visible");
      els.emptyState.textContent =
        state.filter === "all" || allTasks.length === 0
          ? "No hay tareas para este día."
          : "No hay tareas con ese estado.";
      return;
    }
    els.emptyState.classList.remove("visible");

    for (const task of tasks) {
      els.taskList.appendChild(renderTaskItem(task, key));
    }
  }

  function formatLongDate(date) {
    const weekday = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][date.getDay()];
    return `${weekday} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
  }

  function buildSummary(tasks) {
    if (!tasks.length) return "Sin tareas registradas";
    const counts = {};
    for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;
    const parts = STATUS_ORDER
      .filter((s) => counts[s])
      .map((s) => {
        const label = STATUSES.find((x) => x.value === s).label;
        return `${counts[s]} ${label.toLowerCase()}`;
      });
    return `${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"} · ${parts.join(", ")}`;
  }

  function renderTaskItem(task, dateKey) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.status = task.status;
    li.dataset.id = task.id;

    const main = document.createElement("div");
    main.className = "task-main";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = task.status === "completado";
    check.setAttribute("aria-label", "Marcar como completado");
    check.addEventListener("change", () => {
      updateTaskStatus(dateKey, task.id, check.checked ? "completado" : "pendiente");
    });
    main.appendChild(check);

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.name;
    main.appendChild(text);

    if (task.time) {
      const time = document.createElement("span");
      time.className = "task-time-badge";
      time.textContent = task.time;
      main.appendChild(time);
    }

    li.appendChild(main);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const select = document.createElement("select");
    select.className = "status-select";
    select.setAttribute("aria-label", "Cambiar estado");
    for (const s of STATUSES) {
      const opt = document.createElement("option");
      opt.value = s.value;
      opt.textContent = s.label;
      if (s.value === task.status) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      updateTaskStatus(dateKey, task.id, select.value);
    });
    actions.appendChild(select);

    if (task.status === "pospuesto") {
      const moveBtn = document.createElement("button");
      moveBtn.type = "button";
      moveBtn.className = "icon-btn";
      moveBtn.textContent = "Mover";
      moveBtn.title = "Mover a otra fecha";
      moveBtn.addEventListener("click", () => openMoveModal(dateKey, task));
      actions.appendChild(moveBtn);
    }

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn danger";
    delBtn.textContent = "Eliminar";
    delBtn.addEventListener("click", () => deleteTask(dateKey, task.id));
    actions.appendChild(delBtn);

    li.appendChild(actions);
    return li;
  }

  function addTask(dateKey, name, time) {
    const tasks = getTasksForDate(dateKey).slice();
    tasks.push({
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      status: "pendiente",
      time: time || "",
      createdAt: Date.now(),
    });
    setTasksForDate(dateKey, tasks);
    renderCalendar();
    renderPanel();
  }

  function addTasksBulk(dateKey, names, time) {
    const cleaned = names.map((n) => (n || "").trim()).filter(Boolean);
    if (cleaned.length === 0) return 0;
    const tasks = getTasksForDate(dateKey).slice();
    const now = Date.now();
    cleaned.forEach((name, idx) => {
      tasks.push({
        id: `t_${now}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        status: "pendiente",
        time: time || "",
        createdAt: now + idx,
      });
    });
    setTasksForDate(dateKey, tasks);
    renderCalendar();
    renderPanel();
    return cleaned.length;
  }

  function updateTaskStatus(dateKey, id, status) {
    const tasks = getTasksForDate(dateKey).map((t) =>
      t.id === id ? { ...t, status } : t
    );
    setTasksForDate(dateKey, tasks);
    renderCalendar();
    renderPanel();
  }

  function deleteTask(dateKey, id) {
    const tasks = getTasksForDate(dateKey).filter((t) => t.id !== id);
    setTasksForDate(dateKey, tasks);
    renderCalendar();
    renderPanel();
  }

  function openMoveModal(dateKey, task) {
    state.pendingMoveId = { dateKey, id: task.id };
    els.moveTaskName.textContent = task.name;
    els.moveDateInput.value = dateKey;
    els.moveModal.classList.add("open");
    els.moveModal.setAttribute("aria-hidden", "false");
  }

  function closeMoveModal() {
    state.pendingMoveId = null;
    els.moveModal.classList.remove("open");
    els.moveModal.setAttribute("aria-hidden", "true");
  }

  function confirmMove() {
    if (!state.pendingMoveId) return;
    const { dateKey, id } = state.pendingMoveId;
    const newKey = els.moveDateInput.value;
    if (!newKey || newKey === dateKey) {
      closeMoveModal();
      return;
    }

    const fromTasks = getTasksForDate(dateKey);
    const task = fromTasks.find((t) => t.id === id);
    if (!task) {
      closeMoveModal();
      return;
    }
    const remaining = fromTasks.filter((t) => t.id !== id);
    setTasksForDate(dateKey, remaining);

    const toTasks = getTasksForDate(newKey).slice();
    toTasks.push({ ...task, status: "pendiente" });
    setTasksForDate(newKey, toTasks);

    const newDate = parseDateKey(newKey);
    state.viewDate = startOfMonth(newDate);
    state.selectedDate = newDate;

    closeMoveModal();
    renderCalendar();
    renderPanel();
  }

  els.prevMonth.addEventListener("click", () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  els.nextMonth.addEventListener("click", () => {
    state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + 1, 1);
    renderCalendar();
  });
  els.todayBtn.addEventListener("click", () => {
    const today = new Date();
    state.viewDate = startOfMonth(today);
    openPanel(today);
  });
  els.statusFilter.addEventListener("change", (e) => {
    state.filter = e.target.value;
    renderCalendar();
    renderPanel();
  });
  els.closePanel.addEventListener("click", closePanel);
  els.backdrop.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.moveModal.classList.contains("open")) closeMoveModal();
      else if (els.taskPanel.classList.contains("open")) closePanel();
    }
  });
  let bulkMode = false;

  function parseBulkLines(text) {
    return text
      .split(/\r?\n/)
      .map((l) => l.replace(/^[\s*\-•·]+/, "").trim())
      .filter(Boolean);
  }

  function updateAddButtonLabel() {
    const addBtn = els.taskForm.querySelector(".add-btn");
    if (!addBtn) return;
    if (bulkMode) {
      const count = parseBulkLines(els.taskBulkInput.value).length;
      addBtn.textContent = count > 0 ? `Agregar ${count}` : "Agregar";
    } else {
      addBtn.textContent = "Agregar";
    }
  }

  function setBulkMode(on) {
    bulkMode = on;
    els.taskInput.hidden = on;
    els.taskBulkInput.hidden = !on;
    els.taskInput.required = !on;
    els.modeToggle.setAttribute("aria-pressed", String(on));
    els.modeToggle.querySelector(".mode-toggle-label").textContent = on
      ? "Modo simple"
      : "Modo lote";
    updateAddButtonLabel();
    setTimeout(() => {
      (on ? els.taskBulkInput : els.taskInput).focus();
    }, 50);
  }

  els.modeToggle.addEventListener("click", () => setBulkMode(!bulkMode));
  els.taskBulkInput.addEventListener("input", updateAddButtonLabel);

  els.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.selectedDate) return;
    const time = timePicker.getValue();
    const dateKey = formatDateKey(state.selectedDate);

    if (bulkMode) {
      const lines = parseBulkLines(els.taskBulkInput.value);
      if (lines.length === 0) return;
      const added = addTasksBulk(dateKey, lines, time);
      els.taskBulkInput.value = "";
      timePicker.clear();
      updateAddButtonLabel();
      els.micHint.classList.remove("error");
      els.micHint.textContent = `${added} tarea${added === 1 ? "" : "s"} agregada${added === 1 ? "" : "s"}.`;
      els.taskBulkInput.focus();
      return;
    }

    const name = els.taskInput.value.trim();
    if (!name) return;
    addTask(dateKey, name, time);
    els.taskInput.value = "";
    timePicker.clear();
    els.taskInput.focus();
  });
  els.cancelMove.addEventListener("click", closeMoveModal);
  els.confirmMove.addEventListener("click", confirmMove);

  const timePicker = setupTimePicker();
  setupDictation();
  renderCalendar();

  function setupTimePicker() {
    const wrap = document.getElementById("timePicker");
    const trigger = document.getElementById("timeTrigger");
    const display = document.getElementById("timeDisplay");
    const popover = document.getElementById("timePopover");
    const hourWheel = document.getElementById("hourWheel");
    const minuteWheel = document.getElementById("minuteWheel");
    const clearInline = document.getElementById("timeClearInline");
    const clearBtn = document.getElementById("timeClear");
    const confirmBtn = document.getElementById("timeConfirm");
    const hidden = document.getElementById("taskTime");
    const quickBtns = popover.querySelectorAll(".time-quick button");

    let hour = null;
    let minute = null;

    function pad2(n) { return String(n).padStart(2, "0"); }

    for (let h = 0; h < 24; h++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pad2(h);
      btn.dataset.hour = h;
      btn.setAttribute("role", "option");
      btn.addEventListener("click", () => {
        hour = h;
        if (minute == null) minute = 0;
        syncSelection();
        commit();
      });
      hourWheel.appendChild(btn);
    }
    for (let m = 0; m < 60; m += 5) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pad2(m);
      btn.dataset.minute = m;
      btn.setAttribute("role", "option");
      btn.addEventListener("click", () => {
        minute = m;
        if (hour == null) hour = new Date().getHours();
        syncSelection();
        commit();
      });
      minuteWheel.appendChild(btn);
    }

    function syncSelection() {
      hourWheel.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("selected", Number(b.dataset.hour) === hour);
      });
      minuteWheel.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("selected", Number(b.dataset.minute) === minute);
      });
    }

    function scrollToSelected(smooth = true) {
      const prev = { h: hourWheel.style.scrollBehavior, m: minuteWheel.style.scrollBehavior };
      if (!smooth) {
        hourWheel.style.scrollBehavior = "auto";
        minuteWheel.style.scrollBehavior = "auto";
      }
      const hSel = hourWheel.querySelector(".selected");
      if (hSel) {
        hourWheel.scrollTop = hSel.offsetTop - hourWheel.clientHeight / 2 + hSel.offsetHeight / 2;
      }
      const mSel = minuteWheel.querySelector(".selected");
      if (mSel) {
        minuteWheel.scrollTop = mSel.offsetTop - minuteWheel.clientHeight / 2 + mSel.offsetHeight / 2;
      }
      if (!smooth) {
        hourWheel.style.scrollBehavior = prev.h;
        minuteWheel.style.scrollBehavior = prev.m;
      }
    }

    function commit() {
      if (hour != null && minute != null) {
        const value = `${pad2(hour)}:${pad2(minute)}`;
        hidden.value = value;
        display.textContent = value;
        trigger.classList.remove("empty");
        clearInline.hidden = false;
      } else {
        hidden.value = "";
        display.textContent = "Sin hora";
        trigger.classList.add("empty");
        clearInline.hidden = true;
      }
    }

    function open() {
      if (hour == null || minute == null) {
        const now = new Date();
        hour = now.getHours();
        minute = Math.round(now.getMinutes() / 5) * 5;
        if (minute === 60) { minute = 0; hour = (hour + 1) % 24; }
      }
      syncSelection();
      popover.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => scrollToSelected(false));
    }

    function close() {
      popover.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }

    function clearValue() {
      hour = null;
      minute = null;
      syncSelection();
      commit();
    }

    trigger.addEventListener("click", (e) => {
      if (e.target === clearInline) return;
      popover.classList.contains("open") ? close() : open();
    });

    clearInline.addEventListener("click", (e) => {
      e.stopPropagation();
      clearValue();
    });

    clearBtn.addEventListener("click", () => {
      clearValue();
      close();
    });

    confirmBtn.addEventListener("click", close);

    quickBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const [h, m] = btn.dataset.time.split(":").map(Number);
        hour = h;
        minute = m;
        syncSelection();
        commit();
        close();
      });
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target) && popover.classList.contains("open")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && popover.classList.contains("open")) {
        close();
        e.stopPropagation();
      }
    });

    commit();

    return {
      getValue: () => hidden.value,
      clear: clearValue,
      setValue(v) {
        if (!v) { clearValue(); return; }
        const [h, m] = v.split(":").map(Number);
        if (Number.isFinite(h) && Number.isFinite(m)) {
          hour = h;
          minute = Math.round(m / 5) * 5 % 60;
          syncSelection();
          commit();
        }
      },
    };
  }

  function setupDictation() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      els.micBtn.style.display = "none";
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let listening = false;
    let userStopped = false;
    let collected = [];

    function splitIntoTasks(text) {
      return text
        .split(/[,;.\n]+|\s+(?:luego|después|despues|siguiente(?:\s+tarea)?|otra\s+tarea|y\s+luego|y\s+después|y\s+despues|punto)\s+/i)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    function setButtonListening(on) {
      listening = on;
      els.micBtn.classList.toggle("listening", on);
      els.micBtn.querySelector(".mic-label").textContent = on ? "Detener" : "Dictar";
    }

    function updateHint(interim) {
      if (!listening) return;
      const n = collected.length;
      const base = `Escuchando… (${n} capturada${n === 1 ? "" : "s"})`;
      els.micHint.classList.remove("error");
      els.micHint.textContent = interim ? `${base} · "${interim}"` : base;
    }

    els.micBtn.addEventListener("click", () => {
      if (listening) {
        userStopped = true;
        try { recognition.stop(); } catch {}
        return;
      }
      if (!state.selectedDate) {
        els.micHint.textContent = "Selecciona primero un día del calendario.";
        els.micHint.classList.add("error");
        return;
      }
      collected = [];
      userStopped = false;
      els.taskInput.value = "";
      els.micHint.classList.remove("error");
      try {
        recognition.start();
        setButtonListening(true);
        updateHint("");
      } catch {
        setButtonListening(false);
      }
    });

    recognition.addEventListener("result", (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          splitIntoTasks(text).forEach((t) => collected.push(t));
        } else {
          interim += text;
        }
      }
      updateHint(interim.trim());
    });

    recognition.addEventListener("error", (event) => {
      if (event.error === "no-speech" && !userStopped) return;
      const messages = {
        "audio-capture": "No se detectó micrófono.",
        "not-allowed": "Permiso de micrófono denegado.",
        "network": "Error de red al dictar.",
        "aborted": "",
      };
      const msg = event.error in messages ? messages[event.error] : `Error al dictar (${event.error}).`;
      if (msg) {
        els.micHint.textContent = msg;
        els.micHint.classList.add("error");
      }
      userStopped = true;
    });

    recognition.addEventListener("end", () => {
      if (!userStopped && listening) {
        try {
          recognition.start();
          return;
        } catch {}
      }
      setButtonListening(false);
      if (state.selectedDate && collected.length > 0) {
        const added = addTasksBulk(
          formatDateKey(state.selectedDate),
          collected,
          timePicker.getValue()
        );
        els.taskInput.value = "";
        timePicker.clear();
        els.micHint.textContent = `${added} tarea${added === 1 ? "" : "s"} agregada${added === 1 ? "" : "s"}.`;
        els.micHint.classList.remove("error");
      } else if (!els.micHint.classList.contains("error")) {
        els.micHint.textContent = "";
      }
      collected = [];
    });
  }
})();
