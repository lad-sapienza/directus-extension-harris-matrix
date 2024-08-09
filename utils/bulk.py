pstart=100
prec=500
bulk=1000
avoid=[8,9]

for x in range(bulk-prec):
  us_id="us_test_" + str(prec + x + 1)
  us_name="US TEST " + str(prec + x + 1)
  
  ins="insert into tutorial_collection (tc_us_id,tc_us_label,descrizione_unita_stratigrafica,tc_us_node_type,test_field) values ('" + str(us_id) + "', '" + str(us_name) + "','test','layer','test');"
  print(ins)
  
  for e in range(prec-pstart):
    i = e+1
    if i in avoid:
        continue
    print("insert into tutorial_us_relations (this_context,other_context,relationship) values ('" + str(i) + "', '" + str(x + 1 + prec) + "','covers');")
  
  
from random import randrange
clus=int((bulk-prec)/4)
keys=[]
while clus > 0:
    v=randrange(bulk-prec) + prec + 1
    w=randrange(bulk-prec) + prec + 1
    if v==w:
        continue
    
    key=str(v) + "-" + str(w)
    if key in keys:
        print("Skipping " + key)
        continue
    
    keys.append(key)
    
    print("insert into tutorial_us_relations (this_context,other_context,relationship) values ('" + str(v) + "', '" + str(w) + "','is bound to');")
    
    clus -= 1
    


  
  

