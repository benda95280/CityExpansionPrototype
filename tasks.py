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
            'completion_percentage': self.completion_percentage
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
        for task in self.get_active_tasks():
            if now >= task.next_execution:
                if self.debug:
                    print(f"Task '{task.name}' is going to be executed")
                yield task
                task.completion_percentage = min(100, task.completion_percentage + 1)

    def to_dict(self):
        return {
            'tasks': [task.to_dict() for task in self.tasks]
        }

    def update_task_completion(self, task_name, completion_percentage):
        for task in self.tasks:
            if task.name == task_name:
                task.completion_percentage = completion_percentage
                break
