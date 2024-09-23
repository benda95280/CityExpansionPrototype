import random
from datetime import datetime, timedelta

class Task:
    def __init__(self, name, task_type, callback, interval=None, min_interval=None, max_interval=None):
        self.name = name
        self.task_type = task_type
        self.callback = callback
        self.interval = interval
        self.min_interval = min_interval
        self.max_interval = max_interval
        self.active = True
        self.next_execution = None
        self.completion_percentage = 0
        self.is_recurring = task_type == 'recurring'
        self.update_next_execution()

    def update_next_execution(self):
        now = datetime.now()
        if self.task_type == 'recurring':
            self.next_execution = now + timedelta(seconds=self.interval)
        elif self.task_type == 'random':
            random_interval = random.randint(self.min_interval, self.max_interval)
            self.next_execution = now + timedelta(seconds=random_interval)

    def execute(self, game_state):
        if callable(self.callback):
            result = self.callback(game_state)
            self.update_next_execution()
            if not self.is_recurring:
                self.active = False
            return result
        return None

    def to_dict(self):
        return {
            'name': self.name,
            'task_type': self.task_type,
            'interval': self.interval,
            'min_interval': self.min_interval,
            'max_interval': self.max_interval,
            'next_execution': self.next_execution.isoformat() if self.next_execution else None,
            'active': self.active,
            'completion_percentage': self.completion_percentage,
            'is_recurring': self.is_recurring
        }

class TaskManager:
    def __init__(self):
        self.tasks = []
        self.debug = True

    def add_task(self, task):
        self.tasks.append(task)
        if self.debug:
            print(f"Task registered: {task.name}")

    def remove_task(self, task_name):
        self.tasks = [t for t in self.tasks if t.name != task_name]

    def get_tasks(self):
        return self.tasks

    def get_active_tasks(self):
        return [t for t in self.tasks if t.active]

    def set_debug(self, debug):
        self.debug = debug

    def update_tasks(self, game_state):
        now = datetime.now()
        completed_tasks = []
        for task in self.get_active_tasks():
            if now >= task.next_execution:
                if self.debug:
                    print(f"Task '{task.name}' is going to be executed")
                yield task
                if not task.is_recurring:
                    completed_tasks.append(task)
        
        # Remove completed non-recurring tasks
        for task in completed_tasks:
            self.remove_task(task.name)
            if self.debug:
                print(f"Task '{task.name}' completed and removed")

    def to_dict(self):
        return {
            'tasks': [task.to_dict() for task in self.tasks]
        }

    def update_task_completion(self, task_name, completion_percentage):
        for task in self.tasks:
            if task.name == task_name:
                task.completion_percentage = completion_percentage
                break
