import random

class Event:
    def __init__(self, name, interval, function_name, is_random=False, min_interval=None, max_interval=None, initial_tick=0):
        self.name = name
        self.interval = interval
        self.function_name = function_name
        self.is_random = is_random
        self.min_interval = min_interval
        self.max_interval = max_interval
        self.next_tick = initial_tick

    def update_next_tick(self, current_tick):
        if self.is_random:
            self.next_tick = current_tick + random.randint(self.min_interval, self.max_interval)
        else:
            self.next_tick = current_tick + self.interval

    def to_dict(self):
        return {
            'name': self.name,
            'interval': self.interval,
            'function_name': self.function_name,
            'is_random': self.is_random,
            'min_interval': self.min_interval,
            'max_interval': self.max_interval,
            'next_tick': self.next_tick
        }
