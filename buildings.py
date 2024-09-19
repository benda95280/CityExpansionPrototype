import json
from flask_socketio import emit
from datetime import datetime

# Load building data
with open('static/data/buildings.json', 'r') as f:
    buildings_data = json.load(f)

def find_available_building(game_state):
    for coords, building in game_state['grid'].items():
        for accommodation in building['accommodations']:
            if len(accommodation) < buildings_data[building['type']]['max_people_per_accommodation']:
                return coords
    return None

def handle_place_building(data, game_state, socketio):
    x, y = data['x'], data['y']
    building_type = data['building_type']
    
    if game_state['money'] >= buildings_data[building_type]['price']:
        game_state['grid'][f"{x},{y}"] = {
            'type': building_type,
            'level': 1,
            'accommodations': [[] for _ in range(buildings_data[building_type]['accommodations'])],
            'total_accommodations': buildings_data[building_type]['accommodations'],
            'construction_start': game_state['current_date'],
            'construction_end': game_state['current_date'] + buildings_data[building_type]['construction_time']
        }
        game_state['money'] -= buildings_data[building_type]['price']
        game_state['total_accommodations'] += buildings_data[building_type]['accommodations']
        
        socketio.emit('building_placed', {'x': x, 'y': y, 'type': building_type})

def handle_upgrade_building(data, game_state, socketio):
    x, y = data['x'], data['y']
    building = game_state['grid'].get(f"{x},{y}")
    
    if building and building['construction_end'] <= game_state['current_date']:
        building_type = building['type']
        next_level = building['level'] + 1
        upgrade_cost = buildings_data[building_type]['upgrade_cost'] * next_level
        
        if game_state['money'] >= upgrade_cost:
            building['level'] = next_level
            new_accommodations = buildings_data[building_type]['accommodations']
            building['accommodations'].extend([[] for _ in range(new_accommodations)])
            building['total_accommodations'] += new_accommodations
            game_state['total_accommodations'] += new_accommodations
            game_state['money'] -= upgrade_cost
            
            building['construction_start'] = game_state['current_date']
            building['construction_end'] = game_state['current_date'] + buildings_data[building_type]['upgrade_time']
            
            socketio.emit('building_upgraded', {'x': x, 'y': y, 'level': next_level})

def update_buildings(game_state):
    for coords, building in game_state['grid'].items():
        if building['construction_end'] > game_state['current_date']:
            # Building is still under construction
            progress = (game_state['current_date'] - building['construction_start']).total_seconds() / (building['construction_end'] - building['construction_start']).total_seconds()
            building['construction_progress'] = min(1, max(0, progress))
        else:
            # Building construction is complete
            building['construction_progress'] = 1

def calculate_city_income(game_state):
    total_income = 0
    for building in game_state['grid'].values():
        if building['construction_end'] <= game_state['current_date']:
            building_type = building['type']
            building_level = building['level']
            income_per_citizen = buildings_data[building_type]['income_per_citizen']
            total_citizens = sum(len(acc) for acc in building['accommodations'])
            building_income = total_citizens * income_per_citizen * building_level
            total_income += building_income
    return total_income

def update_city_finances(game_state):
    hourly_income = calculate_city_income(game_state)
    game_state['money'] += hourly_income
