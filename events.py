import random

class Event:
    def __init__(self, name, interval, is_random=False, min_interval=None, max_interval=None):
        self.name = name
        self.interval = interval
        self.is_random = is_random
        self.min_interval = min_interval
        self.max_interval = max_interval
        self.next_tick = 0

    def update_next_tick(self, current_tick):
        if self.is_random:
            self.next_tick = current_tick + random.randint(self.min_interval, self.max_interval)
        else:
            self.next_tick = current_tick + self.interval

    def to_dict(self):
        return {
            'name': self.name,
            'interval': self.interval,
            'is_random': self.is_random,
            'min_interval': self.min_interval,
            'max_interval': self.max_interval,
            'next_tick': self.next_tick
        }
