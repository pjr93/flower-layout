from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from time import sleep
import json
import pathlib as pl

# Selenium specific function
def find_links(start_link, exclude):
    driver.get(start_link)
    elements = driver.find_elements(By.TAG_NAME, 'a')
    data =[]
    for element in elements:
        link = element.get_attribute('href')
        name = element.text
        if name not in exclude and link is not None and ('objectgroup_id' in link or 'guide_id' in link):
            data.append({'link': link, 'name': name})
        
    return data

# Network object for convenience
class Net:
    def __init__(self):
        self._graph = {"nodes":[],"edges":[]}
        
    def add_edge(self, fro, to):
        self._graph["edges"].append({"from": fro, "to": to})
        
    def add_node(self, id, data=None):
        self._graph["nodes"].append({"id":id,"data":data})
        
    def save(self, name):
        with open(f"{name}", "w") as f: # must have .json extension
            json.dump(self._graph, f, indent=4)

    @property
    def graph(self):
        return self._graph
    
    @graph.setter
    def graph(self, new_graph):
        self._graph = new_graph
        

from collections import deque
# bfs to apply the scraping and saving
def bfs(start_link, network: Net, exclude, graph_path_name, progress_path_name ,  progress = None, crawl_delay = 5, save_count = 50):
    visited = set() if not progress else set(progress["visited"])
    
    print(f"Current graph size. Nodes: {len(n.graph["nodes"])}, Edges: {len(n.graph["edges"])}")
    queue = deque([start_link]) if not progress else deque(progress["queue"])
    
    count = 0 if not progress else progress["count"] - 1
    if not progress:
        visited.add(start_link)
        network.add_node(id=start_link)
    while queue:
        current_link = queue.popleft()
        
        sleep(crawl_delay)
        
        count+=1

        print(f"\n--- {count} --- {current_link}\n")
        for data in find_links(current_link, exclude):
            link = data['link']
            
            if link not in visited:
                print(f"new link: {link}")
                visited.add(link)
                queue.append(link)
                network.add_edge(current_link,link)
                network.add_node(id=current_link, data = data)
            # put a save_count delay in other scrapes if the crawl delay isn't so large.
            # tomorrow, depending on progress, I can save visited so I can continue where I left off to allow for updates
            network.save(graph_path_name)
            with open(progress_path_name,"w") as f:
                json.dump({"visited": list(visited), "queue": list(queue), "count": count}, f , indent = 4)

if __name__ == "__main__":
    
    start_link = 'https://www.thorlabs.com/navigation.cfm'
    exclude = ['Products', 'Rapid Order', 'Services', 'Company', ' Products Home' , '']
    progress_path_name = "thorlabs.com/thorlabs.com.progress.json"
    graph_path_name = "thorlabs.com/thorlabs.com.json"
    
    options = Options()
    driver = webdriver.Chrome(options=options)
    driver.maximize_window()
     # do lower and strip in the future
    n = Net()
    graph, progress = None, None
    
    if pl.Path(progress_path_name).is_file():
        with open(progress_path_name, "r") as f:
            progress = json.load(f)
    if pl.Path(graph_path_name).is_file():
        with open(graph_path_name,"r") as f:
            n.graph = json.load(f)
            
    bfs(start_link, network = n, exclude=exclude, progress=progress, progress_path_name = progress_path_name)
    
    # For some reason https://www.thorlabs.com/navigation.cfm?guide_id=2365 returned no links when there are links. I guess they were already visited? I think it was because I messed up how visited should work. It didn't have the queue so it just skipped those links
    
    #we got header issues with the links, that it is within-page navigation and doesn't represent a new page