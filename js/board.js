/**
 * Board - Renders Kanban columns, task cards, drag-and-drop, and filtering
 */
class Board {
    constructor(options) {
        this.containerEl = options.containerEl;
        this.onTaskMove = options.onTaskMove;
        this.onTaskEdit = options.onTaskEdit;
        this.onTaskDelete = options.onTaskDelete;
        this.onSubtaskToggle = options.onSubtaskToggle;

        this.filterState = {
            searchQuery: '',
            priority: 'all',
            category: 'all',
            sortBy: 'created-desc'
        };

        this.draggedTaskId = null;
        this.initDragAndDrop();
        this.initConfirmModal();
    }

    /**
     * Update board filter state and re-render
     */
    setFilters(newFilters) {
        this.filterState = { ...this.filterState, ...newFilters };
    }

    /**
     * Main Render Engine
     */
    render(tasks) {
        const filtered = this.applyFilterAndSort(tasks);
        
        const columns = {
            'todo': document.getElementById('list-todo'),
            'in-progress': document.getElementById('list-in-progress'),
            'review': document.getElementById('list-review'),
            'completed': document.getElementById('list-completed')
        };

        const counts = { 'todo': 0, 'in-progress': 0, 'review': 0, 'completed': 0 };

        // Clear existing card contents
        Object.values(columns).forEach(col => col.innerHTML = '');

        filtered.forEach(task => {
            if (columns[task.status]) {
                counts[task.status]++;
                const cardEl = this.createTaskCard(task);
                columns[task.status].appendChild(cardEl);
            }
        });

        // Render empty placeholders if column is empty
        Object.keys(columns).forEach(status => {
            const countPill = document.getElementById(`count-${status}`);
            if (countPill) countPill.textContent = counts[status];

            if (counts[status] === 0) {
                columns[status].innerHTML = `
                    <div class="empty-placeholder">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                        <span>No tasks here</span>
                    </div>
                `;
            }
        });

        // Populate category filter dropdown dynamically
        this.updateCategoryOptions(tasks);
    }

    /**
     * Filter & Sorting Logic
     */
    applyFilterAndSort(tasks) {
        let result = [...tasks];

        // Search text filter
        if (this.filterState.searchQuery) {
            const q = this.filterState.searchQuery.toLowerCase();
            result = result.filter(t => 
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q)) ||
                (t.category && t.category.toLowerCase().includes(q))
            );
        }

        // Priority filter
        if (this.filterState.priority !== 'all') {
            result = result.filter(t => t.priority === this.filterState.priority);
        }

        // Category filter
        if (this.filterState.category !== 'all') {
            result = result.filter(t => t.category === this.filterState.category);
        }

        // Sorting
        result.sort((a, b) => {
            if (this.filterState.sortBy === 'created-desc') {
                return new Date(b.createdAt) - new Date(a.createdAt);
            } else if (this.filterState.sortBy === 'created-asc') {
                return new Date(a.createdAt) - new Date(b.createdAt);
            } else if (this.filterState.sortBy === 'dueDate-asc') {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            } else if (this.filterState.sortBy === 'priority-desc') {
                const map = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
                return (map[b.priority] || 0) - (map[a.priority] || 0);
            }
            return 0;
        });

        return result;
    }

    /**
     * Create DOM element for a task card
     */
    createTaskCard(task) {
        const card = document.createElement('div');
        const isCompleted = task.status === 'completed';
        card.className = `task-card ${isCompleted ? 'completed-card' : ''}`;
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);

        const subtaskTotal = task.subtasks ? task.subtasks.length : 0;
        const subtaskDone = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
        const subtaskPercent = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;

        // Due date status evaluation
        let dueStatusClass = '';
        let dueText = '';
        if (task.dueDate) {
            const due = new Date(task.dueDate + 'T23:59:59');
            const now = new Date();
            const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

            if (due < now && !isCompleted) {
                dueStatusClass = 'overdue';
                dueText = `Overdue (${task.dueDate})`;
            } else if (diffDays <= 2 && !isCompleted) {
                dueStatusClass = 'due-soon';
                dueText = `Due in ${diffDays}d (${task.dueDate})`;
            } else {
                dueText = task.dueDate;
            }
        }

        const priorityEmojiMap = {
            'urgent': '🔥 Urgent',
            'high': '🔴 High',
            'medium': '🟡 Medium',
            'low': '🟢 Low'
        };

        card.innerHTML = `
            <div class="card-header">
                <div class="card-tags">
                    <span class="tag-badge">${this.escapeHTML(task.category || 'General')}</span>
                </div>
                <span class="priority-pill priority-${task.priority}">
                    ${priorityEmojiMap[task.priority] || task.priority}
                </span>
            </div>

            <div class="card-title-row">
                <label class="task-checkbox-wrapper" title="${isCompleted ? 'Mark as incomplete' : 'Mark as complete'}">
                    <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} aria-label="Mark task complete">
                    <span class="task-checkbox-custom"></span>
                </label>
                <h3 class="card-title ${isCompleted ? 'completed-title' : ''}">${this.escapeHTML(task.title)}</h3>
            </div>
            
            ${task.description ? `<p class="card-desc">${this.escapeHTML(task.description)}</p>` : ''}

            ${subtaskTotal > 0 ? `
                <div class="card-subtasks">
                    <div class="subtasks-meta">
                        <span>Subtasks</span>
                        <span>${subtaskDone}/${subtaskTotal} (${subtaskPercent}%)</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-bar" style="width: ${subtaskPercent}%"></div>
                    </div>
                </div>
            ` : ''}

            <div class="card-footer">
                ${task.dueDate ? `
                    <div class="due-pill ${dueStatusClass}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>${dueText}</span>
                    </div>
                ` : '<span></span>'}

                <div class="card-actions">
                    <button class="btn-card-action edit-btn" title="Edit Task" aria-label="Edit Task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-card-action danger delete-btn" title="Delete Task" aria-label="Delete Task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;

        // Checkbox event handlers
        const checkbox = card.querySelector('.task-checkbox');
        const checkboxWrapper = card.querySelector('.task-checkbox-wrapper');

        if (checkboxWrapper) {
            checkboxWrapper.addEventListener('click', (e) => e.stopPropagation());
            checkboxWrapper.addEventListener('dblclick', (e) => e.stopPropagation());
        }

        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const targetStatus = e.target.checked ? 'completed' : 'todo';
                if (typeof this.onTaskMove === 'function') {
                    this.onTaskMove(task.id, targetStatus);
                }
            });
        }

        // Card Event Listeners
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.onTaskEdit(task);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDelete(task);
        });

        // Double click to edit card
        card.addEventListener('dblclick', () => this.onTaskEdit(task));

        // Drag handlers
        card.addEventListener('dragstart', (e) => {
            this.draggedTaskId = task.id;
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            this.draggedTaskId = null;
        });

        return card;
    }

    /**
     * Native Drag & Drop Engine Initialization
     */
    initDragAndDrop() {
        const columns = document.querySelectorAll('.task-list');

        columns.forEach(col => {
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                col.classList.add('drag-over');
            });

            col.addEventListener('dragleave', (e) => {
                if (!col.contains(e.relatedTarget)) {
                    col.classList.remove('drag-over');
                }
            });

            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain') || this.draggedTaskId;
                const targetStatus = col.getAttribute('data-status');

                if (taskId && targetStatus && typeof this.onTaskMove === 'function') {
                    this.onTaskMove(taskId, targetStatus);
                }
            });
        });
    }

    /**
     * Delete Confirmation Dialog
     */
    initConfirmModal() {
        this.confirmModalEl = document.getElementById('confirmModal');
        this.confirmTitleEl = document.getElementById('confirmTaskTitle');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.closeConfirmBtn = document.getElementById('closeConfirmBtn');

        this.pendingDeleteTaskId = null;

        const closeConfirm = () => this.confirmModalEl.classList.add('hidden');

        this.confirmDeleteBtn.addEventListener('click', () => {
            if (this.pendingDeleteTaskId && typeof this.onTaskDelete === 'function') {
                this.onTaskDelete(this.pendingDeleteTaskId);
            }
            closeConfirm();
        });

        this.cancelDeleteBtn.addEventListener('click', closeConfirm);
        this.closeConfirmBtn.addEventListener('click', closeConfirm);
    }

    confirmDelete(task) {
        this.pendingDeleteTaskId = task.id;
        this.confirmTitleEl.textContent = `"${task.title}"`;
        this.confirmModalEl.classList.remove('hidden');
    }

    /**
     * Populate Category Dropdown Options
     */
    updateCategoryOptions(tasks) {
        const categorySelect = document.getElementById('categoryFilter');
        if (!categorySelect) return;

        const currentVal = categorySelect.value;
        const categories = Array.from(new Set(tasks.map(t => t.category || 'General')));

        categorySelect.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            if (cat === currentVal) opt.selected = true;
            categorySelect.appendChild(opt);
        });
    }

    escapeHTML(str) {
        return (str || '').replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }
}
