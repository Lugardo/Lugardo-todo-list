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
    taskTime: document.getElementById("taskTime"),
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
    setTimeout(() => els.taskInput.focus(), 150);
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
  els.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.selectedDate) return;
    const name = els.taskInput.value.trim();
    if (!name) return;
    const time = els.taskTime.value;
    addTask(formatDateKey(state.selectedDate), name, time);
    els.taskInput.value = "";
    els.taskTime.value = "";
    els.taskInput.focus();
  });
  els.cancelMove.addEventListener("click", closeMoveModal);
  els.confirmMove.addEventListener("click", confirmMove);

  renderCalendar();
})();
