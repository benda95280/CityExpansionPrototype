commands = {
    'debug on': 'Enable debug mode',
    'debug off': 'Disable debug mode',
    'get tick': 'Get the current tick count',
    'get events': 'Get information about all events',
    'help': 'Show this help message'
}

def get_help_message():
    help_message = "Available commands:\n"
    for command, description in commands.items():
        help_message += f"{command}: {description}\n"
    return help_message
