document.addEventListener('DOMContentLoaded', () => {
  const taskListElement = document.getElementById('task-list');
  const addTaskForm = document.getElementById('add-task-form');
  const newTaskInput = document.getElementById('new-task-input');
  const newTaskDesc = document.getElementById('new-task-desc');
  const newTaskPriority = document.getElementById('new-task-priority');
  
  const btnSync = document.getElementById('btn-sync');
  const syncIcon = document.querySelector('.sync-icon');

  const taskTemplate = document.getElementById('task-template');
  const linkTemplate = document.getElementById('link-template');

  let tasks = [];
  const API_BASE = 'http://localhost:3000/api/tasks';

  // 1. Initialize from local storage exclusively
  loadLocalTasks();

  // 2. Local CRUD operations
  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = newTaskInput.value.trim();
    const desc = newTaskDesc.value.trim();
    const priority = newTaskPriority.value;
    
    if (title) {
      addTaskLocal(title, desc, priority);
      newTaskInput.value = '';
      newTaskDesc.value = '';
      newTaskPriority.value = 'medium';
    }
  });

  function loadLocalTasks() {
    chrome.storage.local.get(['tasks'], (result) => {
      tasks = result.tasks || [];
      renderTasks();
    });
  }

  function saveLocalTasks() {
    chrome.storage.local.set({ tasks }, () => {
      renderTasks();
    });
  }

  function addTaskLocal(title, desc, priority) {
    const newTask = {
      id: Date.now().toString(),
      title: title,
      description: desc,
      priority: priority || 'medium',
      updated_at: Date.now(),
      is_deleted: 0,
      links: []
    };
    tasks.unshift(newTask);
    saveLocalTasks();
  }

  function updateTaskLocal(taskId, title, desc, priority) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.title = title;
      task.description = desc;
      task.priority = priority;
      task.updated_at = Date.now();
      saveLocalTasks();
    }
  }

  function deleteTaskLocal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.is_deleted = 1;
        task.updated_at = Date.now();
        saveLocalTasks();
    }
  }

  function addLinkLocal(taskId, url, title = '') {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      task.links.push({
        id: Date.now().toString(),
        url: url,
        title: title || url,
        updated_at: Date.now(),
        is_deleted: 0
      });
      task.updated_at = Date.now();
      saveLocalTasks();
    }
  }

  function deleteLinkLocal(taskId, linkId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.links) {
      const link = task.links.find(l => l.id === linkId);
      if (link) {
          link.is_deleted = 1;
          link.updated_at = Date.now();
          task.updated_at = Date.now();
          saveLocalTasks();
      }
    }
  }

  async function quickAddCurrentTab(taskId) {
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        addLinkLocal(taskId, tab.url, tab.title);
      }
    } catch (err) {
      console.error('Failed to get current tab:', err);
      alert('Could not retrieve current tab data.');
    }
  }

  // 3. Synchronization Engine
  btnSync.addEventListener('click', () => {
    syncWithServer();
  });

  async function syncWithServer() {
    if (syncIcon.classList.contains('spinning')) return; // prevent duplicate clicks
    
    syncIcon.classList.add('spinning');
    btnSync.title = "Syncing...";

    try {
      // 3a. Fetch server tasks
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error("Server not responding appropriately");
      
      const serverTasks = await response.json();
      const serverTaskMap = new Map(serverTasks.map(st => [st.id, st]));
      let madeChanges = false;

      // 3b. Push missing/newer LOCAL tasks TO server, pull newer SERVER tasks
      for (const localTask of tasks) {
        const serverTask = serverTaskMap.get(localTask.id);
        localTask.updated_at = localTask.updated_at || 0;
        
        if (!serverTask || localTask.updated_at > (serverTask.updated_at || 0)) {
          // Push local task
          await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: localTask.id,
              title: localTask.title,
              description: localTask.description,
              priority: localTask.priority,
              updated_at: localTask.updated_at,
              is_deleted: localTask.is_deleted ? 1 : 0
            })
          });
        } else if (serverTask && serverTask.updated_at > localTask.updated_at) {
          // Pull from server
          Object.assign(localTask, serverTask);
          madeChanges = true;
        }

        // Links sync for this task
        const localLinks = localTask.links || [];
        const serverLinks = serverTask ? (serverTask.links || []) : [];
        const serverLinkMap = new Map(serverLinks.map(sl => [sl.id, sl]));
        
        for (const localLink of localLinks) {
            const serverLink = serverLinkMap.get(localLink.id);
            localLink.updated_at = localLink.updated_at || 0;
            
            if (!serverLink || localLink.updated_at > (serverLink.updated_at || 0)) {
                await fetch(`${API_BASE}/${localTask.id}/links`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: localLink.id, 
                        url: localLink.url, 
                        title: localLink.title,
                        updated_at: localLink.updated_at,
                        is_deleted: localLink.is_deleted ? 1 : 0
                    })
                });
            } else if (serverLink && serverLink.updated_at > localLink.updated_at) {
                Object.assign(localLink, serverLink);
                madeChanges = true;
            }
        }
        
        // Pull missing links from server
        for (const serverLink of serverLinks) {
            if (!localLinks.find(l => l.id === serverLink.id)) {
                localLinks.push(serverLink);
                madeChanges = true;
            }
        }
      }

      // 3c. Pull entirely new SERVER tasks TO local
      const localIds = new Set(tasks.map(lt => lt.id));
      for (const serverTask of serverTasks) {
        if (!localIds.has(serverTask.id)) {
          tasks.push(serverTask);
          madeChanges = true;
        }
      }

      if (madeChanges) {
          tasks.sort((a, b) => b.id.localeCompare(a.id)); 
          saveLocalTasks();
      }

      btnSync.title = "Synced successfully!";
      setTimeout(() => btnSync.title = "Sync with Server", 3000);

    } catch (err) {
      console.error('Sync failed:', err);
      btnSync.title = "Sync Failed - Server offline?";
      setTimeout(() => btnSync.title = "Sync with Server", 4000);
    } finally {
      syncIcon.classList.remove('spinning');
    }
  }


  // 4. UI Rendering
  function renderTasks() {
    taskListElement.innerHTML = '';
    
    const activeTasks = tasks.filter(t => !t.is_deleted);
    
    if (activeTasks.length === 0) {
      taskListElement.innerHTML = '<div class="empty-state">No tasks yet. Create one above!</div>';
      return;
    }

    activeTasks.forEach(task => {
      const taskNode = document.importNode(taskTemplate.content, true);
      const li = taskNode.querySelector('.task-item');
      li.dataset.taskId = task.id;

      // Set titles & desc
      taskNode.querySelector('.task-title').textContent = task.title;
      
      const priorityBadge = taskNode.querySelector('.priority-badge');
      if (task.priority) {
          priorityBadge.textContent = task.priority;
          priorityBadge.classList.add(task.priority);
      } else {
          priorityBadge.style.display = 'none';
      }

      const descNode = taskNode.querySelector('.task-desc');
      if (task.description) {
        descNode.textContent = task.description;
        descNode.style.display = 'block';
      } else {
        descNode.style.display = 'none';
      }

      // Handle Task Edit
      const displayMode = taskNode.querySelector('.task-display-mode');
      const editMode = taskNode.querySelector('.task-edit-mode');
      const editTitleInput = taskNode.querySelector('.edit-task-title');
      const editDescInput = taskNode.querySelector('.edit-task-desc');
      const editPrioritySelect = taskNode.querySelector('.edit-task-priority');

      taskNode.querySelector('.btn-edit-task').addEventListener('click', () => {
        displayMode.style.display = 'none';
        editMode.style.display = 'flex';
        editTitleInput.value = task.title;
        editDescInput.value = task.description || '';
        if (task.priority) editPrioritySelect.value = task.priority;
      });

      taskNode.querySelector('.btn-cancel-edit').addEventListener('click', () => {
        editMode.style.display = 'none';
        displayMode.style.display = 'flex';
      });

      editMode.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTitle = editTitleInput.value.trim();
        const newDesc = editDescInput.value.trim();
        const newPriority = editPrioritySelect.value;
        if (newTitle) {
          updateTaskLocal(task.id, newTitle, newDesc, newPriority);
        }
      });

      // Handle Task Delete
      taskNode.querySelector('.btn-delete-task').addEventListener('click', () => {
        li.style.opacity = '0';
        li.style.transform = 'scale(0.95)';
        setTimeout(() => {
            deleteTaskLocal(task.id);
            li.remove();
        }, 200);
      });

      // Render Links
      const linkListElement = taskNode.querySelector('.link-list');
      (task.links || []).filter(l => !l.is_deleted).forEach((link, idx) => {
        const linkNode = document.importNode(linkTemplate.content, true);
        const linkEl = linkNode.querySelector('.link-item');
        
        linkEl.style.animationDelay = `${idx * 0.05}s`;

        const anchor = linkNode.querySelector('.link-anchor');
        anchor.href = link.url;
        anchor.textContent = link.title;
        anchor.title = link.url; 

        linkNode.querySelector('.btn-delete-link').addEventListener('click', () => {
          deleteLinkLocal(task.id, link.id);
          linkEl.remove();
        });

        linkListElement.appendChild(linkNode);
      });

      // Handle Add Link Manual
      const addLinkForm = taskNode.querySelector('.add-link-form');
      const newLinkInput = taskNode.querySelector('.new-link-input');
      addLinkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = newLinkInput.value.trim();
        if (url) {
          addLinkLocal(task.id, url);
          newLinkInput.value = '';
        }
      });

      // Handle Quick Add
      taskNode.querySelector('.btn-quick-add').addEventListener('click', () => {
        quickAddCurrentTab(task.id);
      });

      taskListElement.appendChild(taskNode);
    });
  }
});
