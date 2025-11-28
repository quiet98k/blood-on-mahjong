# check-deployment

## Accessing the Deployed Application

Once the deployment is running in the Kubernetes cluster, the application can be accessed externally through the assigned **NodePort**:

http://vcm-51072.vm.duke.edu:31823/

---

## Checking Kubernetes Deployment Status

All commands below must be run **inside the VM** at:

```
vcm-51072.vm.duke.edu
```

These commands verify the health of the Kubernetes cluster and the deployment (`blood-on-mahjong-prod`).

---

## 1. Check Cluster Status

```
kubectl cluster-info
```

This shows:

- Kubernetes control plane availability
- DNS (CoreDNS)
- API server endpoint

A healthy cluster will print both endpoints.

---

## 2. Check Namespace Status

List all namespaces:

```
kubectl get namespaces
```

Check everything running inside the project namespace:

```
kubectl get all -n blood-on-mahjong-prod
```

---

## 3. Check Node Status

```
kubectl get nodes -o wide
```

This displays:

- Node readiness (`Ready`)
- Internal/external IPs
- Kubernetes version
- Container runtime
- OS details

Expected node name:

```
vcm-51072.vm.duke.edu
```

---

## 4. Check Pod Status (Project Pods)

List all pods for this project:

```
kubectl get pods -n blood-on-mahjong-prod -o wide
```

Expected pod fields:

- `READY` = `1/1`
- `STATUS` = `Running`

View logs for a specific pod:

```
kubectl logs -n blood-on-mahjong-prod -f <pod-name>
```

Example:

```
kubectl logs -n blood-on-mahjong-prod -f blood-on-mahjong-759989cb56-88fkm
kubectl logs -n blood-on-mahjong-prod -f blood-on-mahjong-759989cb56-h78zd
```

---

## 5. Check Service (NodePort)

Verify the service exposing the app:

```
kubectl get svc -n blood-on-mahjong-prod
```

Expected service output should include something like:

```
blood-on-mahjong   NodePort   ...   3000:31823/TCP
```